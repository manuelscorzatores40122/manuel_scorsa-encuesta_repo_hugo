const express = require('express');
const bcrypt = require('bcryptjs');
const { sql } = require('../db');
const { adminMiddleware, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Columnas base que siempre existen
const FIELDS_BASE = `id, dni, nombre, apellido_paterno, apellido_materno,
  grado, seccion, sexo, fecha_nacimiento, codigo_estudiante,
  apoderado_nombre, apoderado_apellidos, apoderado_dni, apoderado_telefono, apoderado_parentesco,
  padre_nombre, padre_dni, padre_telefono,
  madre_nombre, madre_dni, madre_telefono,
  role, created_at`;

// Columnas opcionales — se agregan si existen en la BD
let FIELDS = FIELDS_BASE;
let fieldsReady = false;

async function getFields() {
  if (fieldsReady) return FIELDS;
  try {
    // Detectar qué columnas opcionales existen
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
    `;
    const existing = new Set(cols.map(c => c.column_name));
    const optional = ['foto_url','telefono','email','direccion',
      'apoderado_email','padre_email','madre_email','updated_at'];
    const extras = optional.filter(c => existing.has(c));
    FIELDS = FIELDS_BASE + (extras.length ? ', ' + extras.join(', ') : '');
    fieldsReady = true;
    console.log('Columnas detectadas:', extras);
  } catch(e) {
    console.error('Error detectando columnas:', e.message);
  }
  return FIELDS;
}

// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const f = await getFields();
    const r = await sql.unsafe(`SELECT ${f} FROM users WHERE id=$1`, [req.user.id]);
    if (!r.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(r[0]);
  } catch (e) {
    console.error('GET /me error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/users/me
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const f = await getFields();
    const {
      foto_url, telefono, email, direccion,
      apoderado_nombre, apoderado_apellidos, apoderado_dni,
      apoderado_telefono, apoderado_email, apoderado_parentesco,
      padre_nombre, padre_dni, padre_telefono, padre_email,
      madre_nombre, madre_dni, madre_telefono, madre_email
    } = req.body;

    // Construir UPDATE dinámico según columnas disponibles
    const existing = new Set(f.split(/[\s,]+/).filter(Boolean));
    const sets = [];
    const vals = [];
    let i = 1;

    const addField = (col, val) => {
      if (existing.has(col)) { sets.push(`${col}=$${i++}`); vals.push(val||null); }
    };

    addField('foto_url', foto_url);
    addField('telefono', telefono);
    addField('email', email);
    addField('direccion', direccion);
    addField('apoderado_nombre', apoderado_nombre);
    addField('apoderado_apellidos', apoderado_apellidos);
    addField('apoderado_dni', apoderado_dni);
    addField('apoderado_telefono', apoderado_telefono);
    addField('apoderado_email', apoderado_email);
    addField('apoderado_parentesco', apoderado_parentesco);
    addField('padre_nombre', padre_nombre);
    addField('padre_dni', padre_dni);
    addField('padre_telefono', padre_telefono);
    addField('padre_email', padre_email);
    addField('madre_nombre', madre_nombre);
    addField('madre_dni', madre_dni);
    addField('madre_telefono', madre_telefono);
    addField('madre_email', madre_email);
    if (existing.has('updated_at')) { sets.push(`updated_at=NOW()`); }

    if (sets.length) {
      vals.push(req.user.id);
      await sql.unsafe(`UPDATE users SET ${sets.join(',')} WHERE id=$${i}`, vals);
    }

    const updated = await sql.unsafe(`SELECT ${f} FROM users WHERE id=$1`, [req.user.id]);
    res.json(updated[0]);
  } catch (e) {
    console.error('PUT /me error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/users (admin)
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const f = await getFields();
    const r = await sql.unsafe(
      `SELECT ${f} FROM users ORDER BY apellido_paterno, apellido_materno, nombre`
    );
    res.json(r);
  } catch (e) {
    console.error('GET /users error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/users/:id (admin)
router.get('/:id', adminMiddleware, async (req, res) => {
  try {
    const f = await getFields();
    const r = await sql.unsafe(`SELECT ${f} FROM users WHERE id=$1`, [req.params.id]);
    if (!r.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(r[0]);
  } catch (e) {
    console.error('GET /users/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/users/:id (admin edita todo)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const f = await getFields();
    const existing = new Set(f.split(/[\s,]+/).filter(Boolean));
    const {
      nombre, apellido_paterno, apellido_materno,
      grado, seccion, sexo, fecha_nacimiento, codigo_estudiante,
      foto_url, telefono, email, direccion,
      apoderado_nombre, apoderado_apellidos, apoderado_dni,
      apoderado_telefono, apoderado_email, apoderado_parentesco,
      padre_nombre, padre_dni, padre_telefono, padre_email,
      madre_nombre, madre_dni, madre_telefono, madre_email
    } = req.body;

    const sets = []; const vals = []; let i = 1;
    const add = (col, val) => { sets.push(`${col}=$${i++}`); vals.push(val||null); };
    const addIf = (col, val) => { if (existing.has(col)) add(col, val); };

    add('nombre', nombre);
    add('apellido_paterno', apellido_paterno);
    add('apellido_materno', apellido_materno);
    add('grado', grado);
    add('seccion', seccion);
    add('sexo', sexo);
    add('fecha_nacimiento', fecha_nacimiento||null);
    add('codigo_estudiante', codigo_estudiante);
    addIf('foto_url', foto_url);
    addIf('telefono', telefono);
    addIf('email', email);
    addIf('direccion', direccion);
    add('apoderado_nombre', apoderado_nombre);
    add('apoderado_apellidos', apoderado_apellidos);
    add('apoderado_dni', apoderado_dni);
    add('apoderado_telefono', apoderado_telefono);
    addIf('apoderado_email', apoderado_email);
    add('apoderado_parentesco', apoderado_parentesco);
    add('padre_nombre', padre_nombre);
    add('padre_dni', padre_dni);
    add('padre_telefono', padre_telefono);
    addIf('padre_email', padre_email);
    add('madre_nombre', madre_nombre);
    add('madre_dni', madre_dni);
    add('madre_telefono', madre_telefono);
    addIf('madre_email', madre_email);
    if (existing.has('updated_at')) sets.push(`updated_at=NOW()`);

    vals.push(req.params.id);
    await sql.unsafe(`UPDATE users SET ${sets.join(',')} WHERE id=$${i}`, vals);
    const updated = await sql.unsafe(`SELECT ${f} FROM users WHERE id=$1`, [req.params.id]);
    res.json(updated[0]);
  } catch (e) {
    console.error('PUT /users/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users/import
router.post('/import', adminMiddleware, async (req, res) => {
  try {
    const { students } = req.body;
    if (!students?.length) return res.status(400).json({ error: 'Datos inválidos' });
    const f = await getFields();
    const existing = new Set(f.split(/[\s,]+/).filter(Boolean));

    let created = 0, updated = 0;
    const errors = [];

    for (const s of students) {
      try {
        if (!s.dni || !s.nombre) continue;
        const hash = await bcrypt.hash(s.dni.trim(), 10);

        // Construir INSERT dinámico
        const cols = ['dni','nombre','apellido_paterno','apellido_materno',
          'grado','seccion','sexo','fecha_nacimiento','codigo_estudiante',
          'padre_nombre','padre_dni','padre_telefono',
          'madre_nombre','madre_dni','madre_telefono',
          'apoderado_nombre','apoderado_apellidos','apoderado_dni',
          'apoderado_parentesco','apoderado_telefono','role','password_hash'];
        const vals = [
          s.dni.trim(), s.nombre, s.apellido_paterno||'', s.apellido_materno||'',
          s.grado||'', s.seccion||'', s.sexo||'', s.fecha_nacimiento||null, s.codigo_estudiante||'',
          s.padre_nombre||null, s.padre_dni||null, s.padre_telefono||null,
          s.madre_nombre||null, s.madre_dni||null, s.madre_telefono||null,
          s.apoderado_nombre||null, s.apoderado_apellidos||null, s.apoderado_dni||null,
          s.apoderado_parentesco||null, s.apoderado_telefono||null,
          'student', hash
        ];

        const placeholders = vals.map((_,i) => `$${i+1}`).join(',');
        const updateCols = ['nombre','apellido_paterno','apellido_materno','grado','seccion','sexo',
          'fecha_nacimiento','codigo_estudiante','padre_nombre','padre_dni','padre_telefono',
          'madre_nombre','madre_dni','madre_telefono','apoderado_nombre','apoderado_apellidos',
          'apoderado_dni','apoderado_parentesco','apoderado_telefono'];
        const onConflict = updateCols.map(c => `${c}=EXCLUDED.${c}`).join(',')
          + (existing.has('updated_at') ? ',updated_at=NOW()' : '');

        const r = await sql.unsafe(
          `INSERT INTO users (${cols.join(',')}) VALUES (${placeholders})
           ON CONFLICT (dni) DO UPDATE SET ${onConflict}`,
          vals
        );
        if (r.count === 1) created++; else updated++;
      } catch(e) {
        errors.push({ dni: s.dni, error: e.message });
      }
    }
    res.json({ message: `${created} insertados, ${updated} actualizados`, errors });
  } catch (e) {
    console.error('POST /import error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users (crear manual)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { dni, nombre, apellido_paterno, apellido_materno, grado, seccion, role } = req.body;
    if (!dni || !nombre) return res.status(400).json({ error: 'DNI y nombre requeridos' });
    const hash = await bcrypt.hash(dni.trim(), 10);
    const f = await getFields();
    const r = await sql.unsafe(
      `INSERT INTO users (dni,nombre,apellido_paterno,apellido_materno,grado,seccion,role,password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${f}`,
      [dni.trim(),nombre,apellido_paterno||'',apellido_materno||'',grado||'',seccion||'',role||'student',hash]
    );
    res.json(r[0]);
  } catch(e) {
    if (e.message.includes('unique')) return res.status(400).json({ error: 'El DNI ya existe' });
    console.error('POST /users error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await sql.unsafe(`DELETE FROM users WHERE id=$1 AND role!='admin'`, [req.params.id]);
    res.json({ message: 'Eliminado' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/:id/reset-password
router.post('/:id/reset-password', adminMiddleware, async (req, res) => {
  try {
    const r = await sql.unsafe(`SELECT * FROM users WHERE id=$1`, [req.params.id]);
    if (!r.length) return res.status(404).json({ error: 'No encontrado' });
    const hash = await bcrypt.hash(r[0].dni, 10);
    await sql.unsafe(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hash, req.params.id]);
    res.json({ message: `Contraseña restablecida a: ${r[0].dni}` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
