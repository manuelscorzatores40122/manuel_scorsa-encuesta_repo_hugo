-- =======================================================
-- IE 40122 MANUEL SCORZA TORRES — Schema completo 2026
-- =======================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  dni VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  grado VARCHAR(50),
  seccion VARCHAR(10),
  sexo VARCHAR(10),
  fecha_nacimiento DATE,
  codigo_estudiante VARCHAR(50),
  foto_url TEXT,
  -- Contacto del estudiante
  telefono VARCHAR(20),
  email VARCHAR(150),
  direccion TEXT,
  -- Apoderado principal
  apoderado_nombre VARCHAR(200),
  apoderado_apellidos VARCHAR(200),
  apoderado_dni VARCHAR(20),
  apoderado_telefono VARCHAR(20),
  apoderado_email VARCHAR(150),
  apoderado_parentesco VARCHAR(50),
  -- Padre
  padre_nombre VARCHAR(200),
  padre_dni VARCHAR(20),
  padre_telefono VARCHAR(20),
  padre_email VARCHAR(150),
  -- Madre
  madre_nombre VARCHAR(200),
  madre_dni VARCHAR(20),
  madre_telefono VARCHAR(20),
  madre_email VARCHAR(150),
  role VARCHAR(10) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surveys (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(300) NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT TRUE,
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'multiple' CHECK (tipo IN ('multiple', 'texto', 'escala')),
  opciones JSONB,
  orden INTEGER DEFAULT 0,
  requerida BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id),
  user_id INTEGER REFERENCES users(id),
  completada BOOLEAN DEFAULT FALSE,
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_completada TIMESTAMP,
  UNIQUE(survey_id, user_id)
);

CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  response_id INTEGER REFERENCES responses(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id),
  respuesta_texto TEXT,
  respuesta_opcion VARCHAR(100),
  respuesta_escala INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin por defecto (password: Admin2026!)
INSERT INTO users (dni, nombre, apellido_paterno, role, password_hash)
VALUES ('admin','Administrador','Sistema','admin',
  '$2a$10$rOzMJFVBD.E5HI1PdPV8IuaJEFJOyPABXS4Y9bW2N1zN3rCHvNxHi')
ON CONFLICT (dni) DO NOTHING;

-- MIGRACIÓN (si ya tienes la BD):
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_url TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS padre_email VARCHAR(150);
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS madre_email VARCHAR(150);
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS apoderado_email VARCHAR(150);
