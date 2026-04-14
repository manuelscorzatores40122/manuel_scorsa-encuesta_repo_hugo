# 📋 Sistema de Encuestas — IE 40122 Manuel Scorza Torres

Aplicación web full-stack para gestión de encuestas estudiantiles.
**Stack:** React · Node.js · Express · Neon (PostgreSQL) · Vercel

---

## 🚀 Configuración Paso a Paso

### 1. Base de Datos en Neon

1. Entra a [neon.tech](https://neon.tech) y crea una cuenta gratuita
2. Crea un nuevo proyecto llamado `encuestas-scorza`
3. Ve a **SQL Editor** y ejecuta el contenido de `scripts/schema.sql`
4. Copia la **Connection String** (formato: `postgres://user:pass@host/db?sslmode=require`)

### 2. Variables de Entorno

Crea el archivo `.env` en la raíz del proyecto (copia `.env.example`):

```env
DATABASE_URL=postgres://tu_usuario:tu_password@tu_host/tu_db?sslmode=require
JWT_SECRET=cambia_esto_por_algo_seguro_12345
NODE_ENV=development
PORT=3001
```

Para el frontend, crea `client/.env`:
```env
REACT_APP_API_URL=http://localhost:3001
```

### 3. Instalación Local

```bash
# Instalar dependencias del servidor
npm install

# Instalar dependencias del cliente
cd client && npm install && cd ..

# Iniciar servidor de desarrollo (API)
npm run dev

# En otra terminal, iniciar React
cd client && npm start
```

La app estará en: **http://localhost:3000**

---

## 🌐 Despliegue en Vercel

### Opción A: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Opción B: GitHub + Vercel Dashboard

1. Sube el proyecto a GitHub
2. Ve a [vercel.com](https://vercel.com) → **New Project** → Importar repositorio
3. En **Environment Variables**, agrega:
   - `DATABASE_URL` = tu connection string de Neon
   - `JWT_SECRET` = una clave secreta segura
   - `NODE_ENV` = `production`
   - `REACT_APP_API_URL` = URL de tu app en Vercel (ej: `https://tu-app.vercel.app`)
4. Click **Deploy**

---

## 👥 Roles y Accesos

### 🔑 Administrador
- **Usuario:** `admin`
- **Contraseña:** `Admin2026!`
- Puede crear/editar/eliminar encuestas
- Importar estudiantes desde Excel del SIAGIE
- Ver resultados y exportar a Excel

### 👨‍🎓 Estudiantes
- **Usuario:** DNI del estudiante
- **Contraseña inicial:** DNI del estudiante (deben cambiarlo)
- Responden las encuestas activas
- Solo pueden responder una vez por encuesta

---

## 📥 Importar Estudiantes desde Excel

El sistema acepta el formato oficial del **SIAGIE** (Reporte de Padres/Estudiantes):

1. Login como admin
2. Ir a pestaña **Estudiantes**
3. Click en **Seleccionar archivo Excel**
4. Seleccionar el archivo `.xlsx` del SIAGIE

El sistema detecta automáticamente las columnas: DNI, Apellidos, Nombres, Grado, Sección, Sexo, Fecha de Nacimiento.

**Contraseña asignada automáticamente:** El DNI de cada estudiante.

---

## 📊 Tipos de Preguntas

| Tipo | Descripción |
|------|-------------|
| ⭕ Opción múltiple | El estudiante elige una opción de una lista |
| ✏️ Texto libre | El estudiante escribe su respuesta |
| 📊 Escala 1-5 | El estudiante puntúa del 1 (muy malo) al 5 (muy bueno) |

---

## 📥 Exportación a Excel

El Excel exportado incluye:
- **Hoja "Respuestas":** Tabla completa con todos los datos del estudiante y sus respuestas
- **Hoja "Resumen":** Estadísticas por pregunta con porcentajes

Columnas incluidas: N°, DNI, Apellido Paterno, Apellido Materno, Nombres, Sexo, Grado, Sección, Fecha Respuesta, Respuesta P1, Respuesta P2...

---

## 🗂 Estructura del Proyecto

```
survey-app/
├── api/
│   ├── server.js          # Servidor Express principal
│   ├── db.js              # Conexión a Neon
│   ├── middleware/
│   │   └── auth.js        # JWT middleware
│   └── routes/
│       ├── auth.js        # Login, cambio de contraseña
│       ├── users.js       # CRUD usuarios, importación Excel
│       └── surveys.js     # CRUD encuestas, respuestas, exportación
├── client/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js         # Routing principal
│       ├── index.js
│       ├── index.css      # Estilos globales
│       ├── context/
│       │   └── AuthContext.js
│       ├── pages/
│       │   ├── Login.js
│       │   ├── AdminDashboard.js
│       │   └── StudentDashboard.js
│       └── components/
│           ├── Navbar.js
│           ├── SurveyBuilder.js  # Crear/editar encuestas
│           ├── SurveyForm.js     # Responder encuesta (estudiante)
│           ├── SurveyResults.js  # Ver resultados (admin)
│           └── UsersManager.js   # Gestionar estudiantes + importar Excel
├── scripts/
│   └── schema.sql         # Script SQL para crear tablas
├── package.json
├── vercel.json
└── .env.example
```

---

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt (10 rounds)
- Autenticación por JWT con expiración de 8 horas
- Rutas protegidas por rol (admin/student)
- El administrador no puede responder encuestas
- Cada estudiante solo puede responder una vez por encuesta

---

## 📞 Soporte

Para reportar problemas o solicitar ayuda, contacta al administrador del sistema.
