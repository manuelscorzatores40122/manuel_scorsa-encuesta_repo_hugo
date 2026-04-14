const express = require('express');
const { sql } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const XLSX = require('xlsx');

const router = express.Router();

// GET /api/surveys - listar encuestas
router.get('/', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      const surveys = await sql`
        SELECT s.*, u.nombre as created_by_name,
          COUNT(DISTINCT q.id) as total_preguntas,
          COUNT(DISTINCT r.id) as total_respuestas
        FROM surveys s
        LEFT JOIN users u ON s.created_by = u.id
        LEFT JOIN questions q ON q.survey_id = s.id
        LEFT JOIN responses r ON r.survey_id = s.id AND r.completada = true
        GROUP BY s.id, u.nombre
        ORDER BY s.created_at DESC
      `;
      return res.json(surveys);
    }

    // Para estudiantes: encuestas activas con estado de respuesta
    const surveys = await sql`
      SELECT s.id, s.titulo, s.descripcion, s.activa, s.fecha_inicio, s.fecha_fin,
        COUNT(DISTINCT q.id) as total_preguntas,
        r.completada,
        r.fecha_completada
      FROM surveys s
      LEFT JOIN questions q ON q.survey_id = s.id
      LEFT JOIN responses r ON r.survey_id = s.id AND r.user_id = ${req.user.id}
      WHERE s.activa = true
      GROUP BY s.id, r.completada, r.fecha_completada
      ORDER BY s.created_at DESC
    `;
    return res.json(surveys);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/surveys - crear encuesta (admin)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { titulo, descripcion, fecha_fin, preguntas } = req.body;

    if (!titulo) return res.status(400).json({ error: 'El título es requerido' });

    const result = await sql`
      INSERT INTO surveys (titulo, descripcion, fecha_fin, created_by)
      VALUES (${titulo}, ${descripcion || ''}, ${fecha_fin || null}, ${req.user.id})
      RETURNING *
    `;
    const survey = result[0];

    // Insertar preguntas
    if (preguntas && preguntas.length > 0) {
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        await sql`
          INSERT INTO questions (survey_id, texto, tipo, opciones, orden, requerida)
          VALUES (
            ${survey.id}, 
            ${p.texto}, 
            ${p.tipo || 'multiple'}, 
            ${p.opciones ? JSON.stringify(p.opciones) : null},
            ${i},
            ${p.requerida !== false}
          )
        `;
      }
    }

    res.json(survey);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/surveys/:id - obtener encuesta con preguntas
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const surveys = await sql`
      SELECT s.*, u.nombre as created_by_name
      FROM surveys s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = ${req.params.id}
    `;
    if (surveys.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada' });

    const survey = surveys[0];
    const questions = await sql`
      SELECT * FROM questions WHERE survey_id = ${req.params.id} ORDER BY orden
    `;

    // Verificar si el estudiante ya respondió
    let response = null;
    if (req.user.role === 'student') {
      const responses = await sql`
        SELECT * FROM responses WHERE survey_id = ${req.params.id} AND user_id = ${req.user.id}
      `;
      response = responses[0] || null;
    }

    res.json({ ...survey, questions, response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/surveys/:id - actualizar encuesta
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { titulo, descripcion, activa, fecha_fin, preguntas } = req.body;

    await sql`
      UPDATE surveys SET 
        titulo = ${titulo},
        descripcion = ${descripcion || ''},
        activa = ${activa !== undefined ? activa : true},
        fecha_fin = ${fecha_fin || null}
      WHERE id = ${req.params.id}
    `;

    if (preguntas) {
      await sql`DELETE FROM questions WHERE survey_id = ${req.params.id}`;
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        await sql`
          INSERT INTO questions (survey_id, texto, tipo, opciones, orden, requerida)
          VALUES (
            ${req.params.id}, ${p.texto}, ${p.tipo || 'multiple'},
            ${p.opciones ? JSON.stringify(p.opciones) : null},
            ${i}, ${p.requerida !== false}
          )
        `;
      }
    }

    res.json({ message: 'Encuesta actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/surveys/:id
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await sql`DELETE FROM surveys WHERE id = ${req.params.id}`;
    res.json({ message: 'Encuesta eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/surveys/:id/respond - enviar respuestas
router.post('/:id/respond', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Los administradores no pueden responder encuestas' });
    }

    const { answers } = req.body;
    const surveyId = req.params.id;
    const userId = req.user.id;

    // Verificar si ya respondió
    const existing = await sql`
      SELECT * FROM responses WHERE survey_id = ${surveyId} AND user_id = ${userId}
    `;
    if (existing.length > 0 && existing[0].completada) {
      return res.status(400).json({ error: 'Ya has respondido esta encuesta' });
    }

    // Crear o actualizar registro de respuesta
    let responseId;
    if (existing.length === 0) {
      const result = await sql`
        INSERT INTO responses (survey_id, user_id, completada, fecha_completada)
        VALUES (${surveyId}, ${userId}, true, NOW())
        RETURNING id
      `;
      responseId = result[0].id;
    } else {
      await sql`
        UPDATE responses SET completada = true, fecha_completada = NOW()
        WHERE id = ${existing[0].id}
      `;
      responseId = existing[0].id;
    }

    // Guardar respuestas individuales
    for (const answer of answers) {
      await sql`
        INSERT INTO answers (response_id, question_id, respuesta_texto, respuesta_opcion, respuesta_escala)
        VALUES (
          ${responseId},
          ${answer.question_id},
          ${answer.respuesta_texto || null},
          ${answer.respuesta_opcion || null},
          ${answer.respuesta_escala || null}
        )
      `;
    }

    res.json({ message: 'Respuestas guardadas correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/surveys/:id/results - resultados (admin)
router.get('/:id/results', adminMiddleware, async (req, res) => {
  try {
    const surveys = await sql`SELECT * FROM surveys WHERE id = ${req.params.id}`;
    if (surveys.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada' });

    const questions = await sql`
      SELECT * FROM questions WHERE survey_id = ${req.params.id} ORDER BY orden
    `;

    const responses = await sql`
      SELECT r.*, u.nombre, u.apellido_paterno, u.apellido_materno,
             u.dni, u.grado, u.seccion, u.sexo
      FROM responses r
      JOIN users u ON r.user_id = u.id
      WHERE r.survey_id = ${req.params.id} AND r.completada = true
      ORDER BY u.apellido_paterno, u.nombre
    `;

    const detailedResponses = [];
    for (const response of responses) {
      const answers = await sql`
        SELECT a.*, q.texto as pregunta, q.tipo
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        WHERE a.response_id = ${response.id}
        ORDER BY q.orden
      `;
      detailedResponses.push({ ...response, answers });
    }

    res.json({
      survey: surveys[0],
      questions,
      responses: detailedResponses,
      total_respondentes: responses.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/surveys/:id/export - exportar a Excel
router.get('/:id/export', adminMiddleware, async (req, res) => {
  try {
    const surveys = await sql`SELECT * FROM surveys WHERE id = ${req.params.id}`;
    if (surveys.length === 0) return res.status(404).json({ error: 'Encuesta no encontrada' });
    const survey = surveys[0];

    const questions = await sql`
      SELECT * FROM questions WHERE survey_id = ${req.params.id} ORDER BY orden
    `;

    const responses = await sql`
      SELECT r.*, u.nombre, u.apellido_paterno, u.apellido_materno,
             u.dni, u.grado, u.seccion, u.sexo, u.fecha_nacimiento
      FROM responses r
      JOIN users u ON r.user_id = u.id
      WHERE r.survey_id = ${req.params.id} AND r.completada = true
      ORDER BY u.grado, u.seccion, u.apellido_paterno, u.nombre
    `;

    // Construir datos para Excel
    const headers = [
      'N°', 'DNI', 'Apellido Paterno', 'Apellido Materno', 'Nombres',
      'Sexo', 'Grado', 'Sección', 'Fecha Respuesta',
      ...questions.map((q, i) => `P${i + 1}: ${q.texto.substring(0, 50)}`)
    ];

    const rows = [];
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const answers = await sql`
        SELECT a.*, q.orden
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        WHERE a.response_id = ${response.id}
        ORDER BY q.orden
      `;

      const answerMap = {};
      for (const ans of answers) {
        answerMap[ans.question_id] = ans.respuesta_opcion || ans.respuesta_texto || ans.respuesta_escala || '';
      }

      const row = [
        i + 1,
        response.dni,
        response.apellido_paterno,
        response.apellido_materno,
        response.nombre,
        response.sexo,
        response.grado?.trim(),
        response.seccion?.trim(),
        new Date(response.fecha_completada).toLocaleDateString('es-PE'),
        ...questions.map(q => answerMap[q.id] || '')
      ];

      rows.push(row);
    }

    // Crear workbook Excel
    const wb = XLSX.utils.book_new();

    // Hoja de respuestas
    const wsData = [
      [`ENCUESTA: ${survey.titulo}`],
      [`INSTITUCIÓN EDUCATIVA: 40122 MANUEL SCORZA TORRES`],
      [`Fecha de exportación: ${new Date().toLocaleDateString('es-PE')}`],
      [`Total de respuestas: ${responses.length}`],
      [],
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Estilos básicos de ancho de columna
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 },
      { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
      ...questions.map(() => ({ wch: 30 }))
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');

    // Hoja de resumen por pregunta
    const summaryData = [['RESUMEN POR PREGUNTA'], []];
    for (const q of questions) {
      summaryData.push([`Pregunta: ${q.texto}`]);
      if (q.tipo === 'multiple' && q.opciones) {
        const opciones = Array.isArray(q.opciones) ? q.opciones : JSON.parse(q.opciones);
        const allAnswers = await sql`
          SELECT a.respuesta_opcion, COUNT(*) as total
          FROM answers a
          JOIN responses r ON a.response_id = r.id
          WHERE a.question_id = ${q.id} AND r.completada = true
          GROUP BY a.respuesta_opcion
        `;
        summaryData.push(['Opción', 'Cantidad', 'Porcentaje']);
        for (const opcion of opciones) {
          const found = allAnswers.find(a => a.respuesta_opcion === opcion);
          const count = found ? parseInt(found.total) : 0;
          const pct = responses.length > 0 ? ((count / responses.length) * 100).toFixed(1) + '%' : '0%';
          summaryData.push([opcion, count, pct]);
        }
      }
      summaryData.push([]);
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="encuesta_${survey.id}_resultados.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al exportar' });
  }
});

module.exports = router;
