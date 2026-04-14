import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SurveyForm from '../components/SurveyForm';
import StudentProfile from '../components/StudentProfile';

const API = process.env.REACT_APP_API_URL || '';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [tab, setTab] = useState('encuestas');

  useEffect(() => { if (tab === 'encuestas') loadSurveys(); }, [tab]);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/surveys`);
      setSurveys(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (activeSurvey) {
    return (
      <SurveyForm
        surveyId={activeSurvey}
        onFinish={() => { setActiveSurvey(null); loadSurveys(); }}
        onCancel={() => setActiveSurvey(null)}
      />
    );
  }

  const pending = surveys.filter(s => !s.completada);
  const completed = surveys.filter(s => s.completada);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {tab === 'encuestas' ? '📋 Mis Encuestas' : '👤 Mi Perfil'}
          </h1>
          <p className="page-subtitle">
            {user?.apellido_paterno} {user?.apellido_materno}, {user?.nombre} —{' '}
            {user?.grado?.trim()} "{user?.seccion?.trim()}"
          </p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'encuestas' ? 'active' : ''}`} onClick={() => setTab('encuestas')}>
          📋 Encuestas
        </button>
        <button className={`tab ${tab === 'perfil' ? 'active' : ''}`} onClick={() => setTab('perfil')}>
          👤 Mi Perfil y Familia
        </button>
      </div>

      {tab === 'perfil' ? (
        <StudentProfile />
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon yellow">⏳</div>
              <div>
                <div className="stat-value">{pending.length}</div>
                <div className="stat-label">Pendientes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">✅</div>
              <div>
                <div className="stat-value">{completed.length}</div>
                <div className="stat-label">Completadas</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner"></div> Cargando encuestas...</div>
          ) : surveys.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No hay encuestas disponibles</h3>
              <p>El administrador aún no ha publicado encuestas activas</p>
            </div>
          ) : (
            <>
              {pending.length > 0 && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#374151' }}>
                    ⏳ Pendientes por responder
                  </h2>
                  {pending.map(survey => (
                    <div key={survey.id} className="survey-card">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 16 }}>{survey.titulo}</span>
                          <span className="badge badge-warning">Pendiente</span>
                        </div>
                        {survey.descripcion && <p style={{ fontSize: 13, color: '#718096', marginBottom: 6 }}>{survey.descripcion}</p>}
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          📝 {survey.total_preguntas} preguntas
                          {survey.fecha_fin && ` · 📅 Hasta: ${new Date(survey.fecha_fin).toLocaleDateString('es-PE')}`}
                        </div>
                      </div>
                      <button className="btn btn-primary" onClick={() => setActiveSurvey(survey.id)}>
                        ✍️ Responder
                      </button>
                    </div>
                  ))}
                </>
              )}

              {completed.length > 0 && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '24px 0 12px', color: '#374151' }}>
                    ✅ Encuestas completadas
                  </h2>
                  {completed.map(survey => (
                    <div key={survey.id} className="survey-card completed">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 16 }}>{survey.titulo}</span>
                          <span className="badge badge-success">Completada</span>
                        </div>
                        {survey.descripcion && <p style={{ fontSize: 13, color: '#718096', marginBottom: 6 }}>{survey.descripcion}</p>}
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          📝 {survey.total_preguntas} preguntas
                          {survey.fecha_completada && ` · ✅ ${new Date(survey.fecha_completada).toLocaleDateString('es-PE')}`}
                        </div>
                      </div>
                      <span style={{ fontSize: 32 }}>✅</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
