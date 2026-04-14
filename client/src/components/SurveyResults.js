import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

export default function SurveyResults({ surveyId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');

  useEffect(() => {
    axios.get(`${API}/api/surveys/${surveyId}/results`).then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [surveyId]);

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/api/surveys/${surveyId}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `encuesta_${data.survey.titulo.replace(/\s+/g, '_')}_resultados.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Error al exportar'); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div> Cargando resultados...</div>;
  if (!data) return <div className="alert alert-error">Error al cargar resultados</div>;

  const { survey, questions, responses, total_respondentes } = data;

  const getAnswerSummary = (question) => {
    const allAnswers = responses.flatMap(r =>
      r.answers.filter(a => a.question_id === question.id)
    );
    if (question.tipo === 'multiple') {
      const counts = {};
      const opciones = question.opciones
        ? (Array.isArray(question.opciones) ? question.opciones : JSON.parse(question.opciones))
        : [];
      opciones.forEach(o => { counts[o] = 0; });
      allAnswers.forEach(a => { if (a.respuesta_opcion) counts[a.respuesta_opcion] = (counts[a.respuesta_opcion] || 0) + 1; });
      return { type: 'multiple', counts, total: allAnswers.length };
    }
    if (question.tipo === 'escala') {
      const vals = allAnswers.map(a => a.respuesta_escala).filter(Boolean);
      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A';
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      vals.forEach(v => { dist[v] = (dist[v] || 0) + 1; });
      return { type: 'escala', avg, dist, total: vals.length };
    }
    return { type: 'texto', answers: allAnswers.map(a => a.respuesta_texto).filter(Boolean) };
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: 8 }}>← Volver</button>
          <h1 className="page-title">📊 {survey.titulo}</h1>
          <p className="page-subtitle">{total_respondentes} estudiantes respondieron</p>
        </div>
        <button className="btn btn-success" onClick={handleExport}>📥 Exportar a Excel</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon blue">❓</div>
          <div><div className="stat-value">{questions.length}</div><div className="stat-label">Preguntas</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div><div className="stat-value">{total_respondentes}</div><div className="stat-label">Respondieron</div></div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'resumen' ? 'active' : ''}`} onClick={() => setTab('resumen')}>📊 Resumen</button>
        <button className={`tab ${tab === 'individual' ? 'active' : ''}`} onClick={() => setTab('individual')}>👤 Individual</button>
      </div>

      {tab === 'resumen' && (
        <div>
          {questions.map((q, qi) => {
            const summary = getAnswerSummary(q);
            return (
              <div key={q.id} className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: '#1a56db', fontSize: 12 }}>Pregunta {qi + 1}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{q.texto}</div>

                {summary.type === 'multiple' && (
                  <div>
                    {Object.entries(summary.counts).map(([op, count]) => {
                      const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
                      return (
                        <div key={op} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                            <span>{op}</span>
                            <span style={{ fontWeight: 600 }}>{count} ({pct}%)</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Total: {summary.total} respuestas</div>
                  </div>
                )}

                {summary.type === 'escala' && (
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#1a56db', marginBottom: 12 }}>{summary.avg} <span style={{ fontSize: 16, color: '#94a3b8' }}>/ 5</span></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <div key={n} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.dist[n] || 0}</div>
                          <div className="scale-btn" style={{ width: '100%', height: 8, borderRadius: 4, background: summary.dist[n] > 0 ? '#1a56db' : '#e2e8f0', border: 'none', display: 'block', cursor: 'default' }}></div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{n}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.type === 'texto' && (
                  <div>
                    {summary.answers.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin respuestas de texto</p>
                    ) : (
                      summary.answers.slice(0, 10).map((ans, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, marginBottom: 6, fontSize: 13, borderLeft: '3px solid #1a56db' }}>
                          {ans}
                        </div>
                      ))
                    )}
                    {summary.answers.length > 10 && (
                      <p style={{ fontSize: 12, color: '#94a3b8' }}>...y {summary.answers.length - 10} más. Exporta a Excel para ver todas.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'individual' && (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Estudiante</th>
                  <th>Grado / Sec.</th>
                  <th>DNI</th>
                  <th>Fecha</th>
                  {questions.map((q, i) => (
                    <th key={q.id}>P{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.length === 0 ? (
                  <tr><td colSpan={5 + questions.length} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>Sin respuestas aún</td></tr>
                ) : (
                  responses.map((r, idx) => (
                    <tr key={r.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.apellido_paterno} {r.apellido_materno}, {r.nombre}</td>
                      <td>{r.grado?.trim()} {r.seccion?.trim()}</td>
                      <td>{r.dni}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.fecha_completada).toLocaleDateString('es-PE')}</td>
                      {questions.map(q => {
                        const ans = r.answers.find(a => a.question_id === q.id);
                        const val = ans ? (ans.respuesta_opcion || ans.respuesta_texto || ans.respuesta_escala || '-') : '-';
                        return <td key={q.id} style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</td>;
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
