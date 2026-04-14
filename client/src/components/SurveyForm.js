import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '';

export default function SurveyForm({ surveyId, onFinish, onCancel }) {
  const { user } = useAuth();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API}/api/surveys/${surveyId}`).then(res => {
      setSurvey(res.data);
      setLoading(false);
      if (res.data.response?.completada) setSubmitted(true);
    }).catch(() => setLoading(false));
  }, [surveyId]);

  const setAnswer = (questionId, field, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: { ...(prev[questionId] || {}), question_id: questionId, [field]: value } }));
  };

  const handleSubmit = async () => {
    setError('');
    // Validate required
    const missing = survey.questions
      .filter(q => q.requerida)
      .filter(q => {
        const ans = answers[q.id];
        if (!ans) return true;
        if (q.tipo === 'multiple') return !ans.respuesta_opcion;
        if (q.tipo === 'texto') return !ans.respuesta_texto?.trim();
        if (q.tipo === 'escala') return !ans.respuesta_escala;
        return false;
      });

    if (missing.length > 0) {
      setError(`Hay ${missing.length} pregunta(s) obligatoria(s) sin responder.`);
      // Scroll to first unanswered
      const el = document.getElementById(`question-${missing[0].id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/surveys/${surveyId}/respond`, {
        answers: Object.values(answers)
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al enviar respuestas');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div> Cargando encuesta...</div>;
  if (!survey) return <div className="alert alert-error">No se pudo cargar la encuesta</div>;

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#059669' }}>¡Encuesta completada!</h2>
        <p style={{ color: '#718096', fontSize: 15, marginBottom: 32 }}>
          Tus respuestas han sido registradas correctamente. Gracias por participar.
        </p>
        <button className="btn btn-primary" onClick={onFinish}>← Volver al inicio</button>
      </div>
    );
  }

  const totalQ = survey.questions.length;
  const answered = survey.questions.filter(q => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (q.tipo === 'multiple') return !!ans.respuesta_opcion;
    if (q.tipo === 'texto') return !!ans.respuesta_texto?.trim();
    if (q.tipo === 'escala') return !!ans.respuesta_escala;
    return false;
  }).length;
  const progress = totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel} style={{ marginBottom: 8 }}>← Volver</button>
          <h1 className="page-title" style={{ fontSize: 20 }}>{survey.titulo}</h1>
          {survey.descripcion && <p className="page-subtitle">{survey.descripcion}</p>}
        </div>
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
          <span>Progreso</span>
          <span>{answered} / {totalQ} preguntas respondidas</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{progress}% completado</div>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {survey.questions.map((q, qi) => {
        const ans = answers[q.id] || {};
        const opciones = q.opciones
          ? (Array.isArray(q.opciones) ? q.opciones : JSON.parse(q.opciones))
          : [];
        const isAnswered = (q.tipo === 'multiple' && ans.respuesta_opcion) ||
          (q.tipo === 'texto' && ans.respuesta_texto?.trim()) ||
          (q.tipo === 'escala' && ans.respuesta_escala);

        return (
          <div key={q.id} id={`question-${q.id}`} className="survey-question"
            style={{ borderColor: isAnswered ? '#10b981' : q.requerida && !isAnswered && error ? '#ef4444' : '#e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1a56db', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Pregunta {qi + 1}
                </span>
                {q.requerida && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
              </div>
              {isAnswered && <span style={{ color: '#10b981', fontSize: 18 }}>✓</span>}
            </div>
            <div className="survey-question-text">{q.texto}</div>

            {q.tipo === 'multiple' && (
              <div>
                {opciones.map((op, oi) => (
                  <div
                    key={oi}
                    className={`radio-option ${ans.respuesta_opcion === op ? 'selected' : ''}`}
                    onClick={() => setAnswer(q.id, 'respuesta_opcion', op)}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={op}
                      checked={ans.respuesta_opcion === op}
                      onChange={() => setAnswer(q.id, 'respuesta_opcion', op)}
                    />
                    <span style={{ fontSize: 14 }}>{op}</span>
                  </div>
                ))}
              </div>
            )}

            {q.tipo === 'texto' && (
              <textarea
                className="form-control"
                value={ans.respuesta_texto || ''}
                onChange={e => setAnswer(q.id, 'respuesta_texto', e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                rows={3}
              />
            )}

            {q.tipo === 'escala' && (
              <div>
                <div className="scale-options">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`scale-btn ${ans.respuesta_escala === n ? 'selected' : ''}`}
                      onClick={() => setAnswer(q.id, 'respuesta_escala', n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 6, maxWidth: 260 }}>
                  <span>1 = Muy malo</span>
                  <span>5 = Muy bueno</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 10, marginTop: 8, marginBottom: 40 }}>
        <button className="btn btn-secondary" onClick={onCancel}>← Cancelar</button>
        <button
          className="btn btn-success"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ flex: 1, fontSize: 15 }}
        >
          {submitting ? '⏳ Enviando...' : `✅ Enviar Respuestas (${answered}/${totalQ})`}
        </button>
      </div>
    </div>
  );
}
