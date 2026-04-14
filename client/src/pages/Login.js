import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(dni.trim(), password);
      navigate(user.role === 'admin' ? '/admin' : '/student');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="school-icon">🏫</div>
          <h1>IE 40122 Manuel Scorza Torres</h1>
          <p>Sistema de Encuestas Estudiantiles</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">DNI / Usuario</label>
            <input
              className="form-control"
              type="text"
              placeholder="Ingresa tu DNI"
              value={dni}
              onChange={e => setDni(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="form-control"
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: 8 }}
          >
            {loading ? '⏳ Iniciando sesión...' : '🔐 Iniciar Sesión'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '16px', background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#718096' }}>
          <strong>ℹ️ Contraseña inicial:</strong> Tu número de DNI<br />
          Si tienes problemas, contacta al administrador.
        </div>
      </div>
    </div>
  );
}
