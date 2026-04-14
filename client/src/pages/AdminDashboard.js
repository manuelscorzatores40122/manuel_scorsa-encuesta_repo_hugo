import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SurveyBuilder from '../components/SurveyBuilder';
import SurveyResults from '../components/SurveyResults';
import UsersManager from '../components/UsersManager';

const API = process.env.REACT_APP_API_URL || '';

export default function AdminDashboard() {
  const [tab, setTab] = useState('surveys');
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const [viewResults, setViewResults] = useState(null);
  const [stats, setStats] = useState({ surveys: 0, students: 0, responses: 0 });

  useEffect(() => { loadSurveys(); }, []);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/surveys`);
      setSurveys(res.data);
      const totalResponses = res.data.reduce((a, s) => a + parseInt(s.total_respuestas || 0), 0);
      setStats(prev => ({ ...prev, surveys: res.data.length, responses: totalResponses }));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta encuesta y todas sus respuestas?')) return;
    try {
      await axios.delete(`${API}/api/surveys/${id}`);
      loadSurveys();
    } catch (e) { alert('Error al eliminar'); }
  };

  const handleToggleActive = async (survey) => {
    try {
      await axios.put(`${API}/api/surveys/${survey.id}`, { ...survey, activa: !survey.activa });
      loadSurveys();
    } catch (e) { alert('Error al actualizar'); }
  };

  const handleExport = async (survey) => {
    try {
      const res = await axios.get(`${API}/api/surveys/${survey.id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `encuesta_${survey.titulo.replace(/\s+/g, '_')}_resultados.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Error al exportar'); }
  };

  if (viewResults) {
    return <SurveyResults surveyId={viewResults} onBack={() => { setViewResults(null); loadSurveys(); }} />;
  }

  if (showBuilder || editingSurvey) {
    return (
      <SurveyBuilder
        survey={editingSurvey}
        onSave={() => { setShowBuilder(false); setEditingSurvey(null); loadSurveys(); }}
        onCancel={() => { setShowBuilder(false); setEditingSurvey(null); }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel Administrador</h1>
          <p className="page-subtitle">Gestiona encuestas y estudiantes</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div>
            <div className="stat-value">{stats.surveys}</div>
            <div className="stat-label">Encuestas creadas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div>
            <div className="stat-value">{stats.responses}</div>
            <div className="stat-label">Respuestas totales</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">👨‍🎓</div>
          <div>
            <div className="stat-value">{stats.students}</div>
            <div className="stat-label">Estudiantes registrados</div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'surveys' ? 'active' : ''}`} onClick={() => setTab('surveys')}>📋 Encuestas</button>
        <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👨‍🎓 Estudiantes</button>
      </div>

      {tab === 'surveys' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => setShowBuilder(true)}>
              ➕ Nueva Encuesta
            </button>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner"></div> Cargando encuestas...</div>
          ) : surveys.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No hay encuestas creadas</h3>
              <p>Crea la primera encuesta para los estudiantes</p>
            </div>
          ) : (
            surveys.map(survey => (
              <div key={survey.id} className={`survey-card ${!survey.activa ? 'inactive' : ''}`}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{survey.titulo}</span>
                    <span className={`badge ${survey.activa ? 'badge-success' : 'badge-gray'}`}>
                      {survey.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  {survey.descripcion && (
                    <p style={{ fontSize: 13, color: '#718096', marginBottom: 8 }}>{survey.descripcion}</p>
                  )}
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94a3b8' }}>
                    <span>📝 {survey.total_preguntas} preguntas</span>
                    <span>✅ {survey.total_respuestas} respuestas</span>
                    <span>📅 {new Date(survey.created_at).toLocaleDateString('es-PE')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewResults(survey.id)}>📊 Resultados</button>
                  <button className="btn btn-success btn-sm" onClick={() => handleExport(survey)}>📥 Excel</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditingSurvey(survey)}>✏️ Editar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleToggleActive(survey)}>
                    {survey.activa ? '⏸ Pausar' : '▶️ Activar'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(survey.id)}>🗑 Eliminar</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'users' && <UsersManager onStudentCount={n => setStats(prev => ({ ...prev, students: n }))} />}
    </div>
  );
}
