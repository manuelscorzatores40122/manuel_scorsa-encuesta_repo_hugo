import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

const TIPOS = [
  { value: 'multiple', label: '⭕ Opción múltiple' },
  { value: 'texto', label: '✏️ Texto libre' },
  { value: 'escala', label: '📊 Escala del 1 al 5' }
];

const emptyQuestion = () => ({
  texto: '',
  tipo: 'multiple',
  opciones: ['', '', ''],
  requerida: true
});

export default function SurveyBuilder({ survey, onSave, onCancel }) {
  const [titulo, setTitulo] = useState(survey?.titulo || '');
  const [descripcion, setDescripcion] = useState(survey?.descripcion || '');
  const [fechaFin, setFechaFin] = useState(survey?.fecha_fin ? survey.fecha_fin.substring(0, 10) : '');
  const [preguntas, setPreguntas] = useState([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (survey?.id) {
      axios.get(`${API}/api/surveys/${survey.id}`).then(res => {
        const { questions } = res.data;
        if (questions && questions.length > 0) {
          setPreguntas(questions.map(q => ({
            ...q,
            opciones: q.opciones
              ? (Array.isArray(q.opciones) ? q.opciones : JSON.parse(q.opciones))
              : ['', '', '']
          })));
        }
      });
    }
  }, [survey]);

  const updateQuestion = (i, field, value) => {
    setPreguntas(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };

  const addOption = (qi) => {
    setPreguntas(prev => prev.map((q, i) =>
      i === qi ? { ...q, opciones: [...(q.opciones || []), ''] } : q
    ));
  };

  const updateOption = (qi, oi, val) => {
    setPreguntas(prev => prev.map((q, i) =>
      i === qi ? { ...q, opciones: q.opciones.map((o, j) => j === oi ? val : o) } : q
    ));
  };

  const removeOption = (qi, oi) => {
    setPreguntas(prev => prev.map((q, i) =>
      i === qi ? { ...q, opciones: q.opciones.filter((_, j) => j !== oi) } : q
    ));
  };

  const removeQuestion = (i) => {
    if (preguntas.length === 1) return;
    setPreguntas(prev => prev.filter((_, idx) => idx !== i));
  };

  const moveQuestion = (i, dir) => {
    const arr = [...preguntas];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setPreguntas(arr);
  };

  const handleSave = async () => {
    setError('');
    if (!titulo.trim()) return setError('El título es requerido');
    if (preguntas.some(p => !p.texto.trim())) return setError('Todas las preguntas deben tener texto');

    const preguntasClean = preguntas.map(p => ({
      ...p,
      opciones: p.tipo === 'multiple' ? p.opciones.filter(o => o.trim()) : null
    }));
    if (preguntasClean.some(p => p.tipo === 'multiple' && (!p.opciones || p.opciones.length < 2))) {
      return setError('Las preguntas de opción múltiple deben tener al menos 2 opciones');
    }

    setSaving(true);
    try {
      if (survey?.id) {
        await axios.put(`${API}/api/surveys/${survey.id}`, { titulo, descripcion, fecha_fin: fechaFin || null, preguntas: preguntasClean });
      } else {
        await axios.post(`${API}/api/surveys`, { titulo, descripcion, fecha_fin: fechaFin || null, preguntas: preguntasClean });
      }
      onSave();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{survey?.id ? '✏️ Editar Encuesta' : '➕ Nueva Encuesta'}</h1>
          <p className="page-subtitle">Configura las preguntas para los estudiantes</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}>← Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Guardando...' : '💾 Guardar Encuesta'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#374151' }}>📄 Información General</h2>
        <div className="form-group">
          <label className="form-label">Título de la encuesta *</label>
          <input className="form-control" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Encuesta de Convivencia Escolar 2026" />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción (opcional)</label>
          <textarea className="form-control" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Instrucciones o contexto para los estudiantes..." rows={2} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Fecha límite (opcional)</label>
          <input className="form-control" type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={{ maxWidth: 200 }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>❓ Preguntas ({preguntas.length})</h2>
        <button className="btn btn-outline btn-sm" onClick={() => setPreguntas(prev => [...prev, emptyQuestion()])}>
          ➕ Agregar Pregunta
        </button>
      </div>

      {preguntas.map((q, qi) => (
        <div key={qi} className="question-block">
          <div className="question-block-header">
            <span style={{ fontWeight: 700, color: '#1a56db' }}>Pregunta {qi + 1}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => moveQuestion(qi, -1)} disabled={qi === 0}>▲</button>
              <button className="btn btn-secondary btn-sm" onClick={() => moveQuestion(qi, 1)} disabled={qi === preguntas.length - 1}>▼</button>
              <button className="btn btn-danger btn-sm" onClick={() => removeQuestion(qi)} disabled={preguntas.length === 1}>🗑</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Texto de la pregunta *</label>
            <textarea
              className="form-control"
              value={q.texto}
              onChange={e => updateQuestion(qi, 'texto', e.target.value)}
              placeholder="Escribe la pregunta aquí..."
              rows={2}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
              <label className="form-label">Tipo de respuesta</label>
              <select className="form-control" value={q.tipo} onChange={e => updateQuestion(qi, 'tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                <input type="checkbox" checked={q.requerida} onChange={e => updateQuestion(qi, 'requerida', e.target.checked)} />
                Obligatoria
              </label>
            </div>
          </div>

          {q.tipo === 'multiple' && (
            <div style={{ marginTop: 12 }}>
              <label className="form-label">Opciones de respuesta</label>
              {(q.opciones || []).map((op, oi) => (
                <div key={oi} className="option-row">
                  <span style={{ color: '#94a3b8', fontSize: 13, minWidth: 20 }}>⭕</span>
                  <input
                    className="form-control"
                    value={op}
                    onChange={e => updateOption(qi, oi, e.target.value)}
                    placeholder={`Opción ${oi + 1}`}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={() => removeOption(qi, oi)} disabled={(q.opciones || []).length <= 2}>✕</button>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={() => addOption(qi)} style={{ marginTop: 4 }}>
                ➕ Agregar opción
              </button>
            </div>
          )}

          {q.tipo === 'escala' && (
            <div style={{ marginTop: 12 }}>
              <label className="form-label">Vista previa de escala</label>
              <div className="scale-options">
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} className="scale-btn" style={{ cursor: 'default', opacity: 0.6 }}>{n}</div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>1 = Muy malo &nbsp;|&nbsp; 5 = Muy bueno</p>
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button className="btn btn-secondary" onClick={onCancel}>← Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
          {saving ? '⏳ Guardando...' : '💾 Guardar Encuesta'}
        </button>
      </div>
    </div>
  );
}
