import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="logo-icon">📋</div>
        <span>Sistema de Encuestas — IE Manuel Scorza Torres</span>
      </div>

      {user && (
        <div className="navbar-user">
          <div className="user-info">
            <div className="user-name">
              {user.apellido_paterno} {user.apellido_materno}, {user.nombre}
            </div>
            <div className="user-role">
              {user.role === 'admin' ? '👑 Administrador' : `📚 ${user.grado?.trim()} ${user.seccion?.trim()}`}
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Salir
          </button>
        </div>
      )}
    </nav>
  );
}
