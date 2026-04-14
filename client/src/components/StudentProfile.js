import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '';
const PARENTESCOS = ['Padre','Madre','Abuelo/a','Tío/a','Hermano/a','Tutor legal','Otro'];

function Avatar({ src, nombre, apellido, sexo, size = 100, onClick, editable }) {
  const initials = `${(apellido||'')[0]||''}${(nombre||'')[0]||''}`.toUpperCase();
  const gradient = sexo === 'Mujer'
    ? 'linear-gradient(135deg,#f472b6,#c084fc)'
    : 'linear-gradient(135deg,#60a5fa,#34d399)';
  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? 'transparent' : gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color: 'white',
      cursor: editable ? 'pointer' : 'default',
      overflow: 'hidden', position: 'relative', flexShrink: 0,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      border: '3px solid rgba(255,255,255,0.6)',
      transition: 'transform 0.2s',
    }}>
      {src
        ? <img src={src} alt="foto" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'} />
        : initials}
      {editable && (
        <div style={{
          position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',
          display:'flex',alignItems:'center',justifyContent:'center',
          opacity:0,transition:'opacity 0.2s',
          fontSize:14,color:'white',fontWeight:700,
        }} className="avatar-overlay">📷</div>
      )}
    </div>
  );
}

function ContactCard({ icon, title, nombre, dni, telefono, email, parentesco, color, onCall }) {
  if (!nombre && !telefono) return null;
  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: '16px 20px',
      border: `2px solid ${color}20`, flex: 1, minWidth: 240,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <div style={{
          width:40,height:40,borderRadius:'50%',
          background:`${color}15`,display:'flex',alignItems:'center',
          justifyContent:'center',fontSize:20,flexShrink:0
        }}>{icon}</div>
        <div>
          <div style={{fontWeight:700,fontSize:13,color:'#374151'}}>{title}</div>
          {parentesco && <span style={{fontSize:11,background:`${color}15`,color,padding:'1px 8px',borderRadius:20,fontWeight:600}}>{parentesco}</span>}
        </div>
      </div>
      {nombre && <div style={{fontWeight:600,fontSize:14,color:'#1a202c',marginBottom:6}}>{nombre}</div>}
      {dni && <div style={{fontSize:12,color:'#94a3b8',marginBottom:8}}>🪪 DNI: {dni}</div>}
      {telefono && (
        <a href={`tel:${telefono}`} style={{
          display:'flex',alignItems:'center',gap:8,
          background:`${color}10`,border:`1.5px solid ${color}40`,
          borderRadius:10,padding:'8px 14px',textDecoration:'none',
          color,fontWeight:700,fontSize:15,marginBottom:6,
          transition:'all 0.2s',
        }}>
          📞 {telefono}
        </a>
      )}
      {email && <div style={{fontSize:12,color:'#718096'}}>✉️ {email}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="form-group" style={{marginBottom:0}}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function StudentProfile() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/users/me`);
      setProfile(r.data); setForm(r.data);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const set = (f,v) => setForm(p=>({...p,[f]:v}));
  const inp = (field, type='text') => ({
    className:'form-control', type, value: form[field]||'',
    onChange: e => set(field, e.target.value)
  });

  // Subir foto como base64 (sin servidor de archivos externo)
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('La foto no debe superar 2MB'); return; }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        const r = await axios.put(`${API}/api/users/me`, { ...form, foto_url: base64 });
        setProfile(r.data); setForm(r.data);
        setSuccess('✅ Foto actualizada');
        setTimeout(()=>setSuccess(''),3000);
      } catch(e) { setError('Error al guardar foto'); }
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const r = await axios.put(`${API}/api/users/me`, form);
      setProfile(r.data); setForm(r.data);
      setEditing(false);
      setSuccess('✅ Datos guardados correctamente');
      setTimeout(()=>setSuccess(''),3000);
    } catch(e) { setError(e.response?.data?.error||'Error al guardar'); }
    setSaving(false);
  };

  const fmt = d => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'}); }
    catch { return d; }
  };

  const edad = d => {
    if (!d) return null;
    const diff = new Date() - new Date(d);
    return `${Math.floor(diff/31557600000)} años`;
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Cargando perfil...</div>;
  if (!profile) return <div className="alert alert-error">Error al cargar perfil</div>;

  return (
    <div>
      {/* ── Hero card ── */}
      <div style={{
        background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1a56db 100%)',
        borderRadius:20,padding:'28px 32px',marginBottom:20,
        display:'flex',alignItems:'center',gap:24,flexWrap:'wrap',
        position:'relative',overflow:'hidden',
        boxShadow:'0 8px 32px rgba(26,86,219,0.3)',
      }}>
        {/* decorative circles */}
        <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.04)'}}/>
        <div style={{position:'absolute',bottom:-60,right:80,width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,0.03)'}}/>

        <div style={{position:'relative'}}>
          <Avatar
            src={profile.foto_url}
            nombre={profile.nombre}
            apellido={profile.apellido_paterno}
            sexo={profile.sexo}
            size={96}
            editable
            onClick={()=>fileRef.current?.click()}
          />
          {uploadingPhoto && (
            <div style={{position:'absolute',inset:0,borderRadius:'50%',background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div className="spinner" style={{borderColor:'rgba(255,255,255,0.3)',borderTopColor:'white'}}/>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoChange}/>
        </div>

        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:22,fontWeight:800,color:'white',lineHeight:1.2}}>
            {profile.apellido_paterno} {profile.apellido_materno}
          </div>
          <div style={{fontSize:17,color:'rgba(255,255,255,0.85)',marginTop:4}}>{profile.nombre}</div>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <span style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'4px 14px',fontSize:12,fontWeight:600,color:'white'}}>
              📚 {profile.grado?.trim()} "{profile.seccion?.trim()}"
            </span>
            <span style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'4px 14px',fontSize:12,fontWeight:600,color:'white'}}>
              🪪 {profile.dni}
            </span>
            {profile.fecha_nacimiento && (
              <span style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'4px 14px',fontSize:12,fontWeight:600,color:'white'}}>
                🎂 {edad(profile.fecha_nacimiento)}
              </span>
            )}
          </div>
          <div style={{marginTop:8,fontSize:11,color:'rgba(255,255,255,0.5)'}}>
            Toca la foto para cambiarla
          </div>
        </div>

        <div style={{display:'flex',gap:8}}>
          {editing ? (
            <>
              <button className="btn btn-secondary" onClick={()=>{setEditing(false);setForm(profile);setError('');}}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving?'⏳ Guardando...':'💾 Guardar'}
              </button>
            </>
          ) : (
            <button style={{
              background:'rgba(255,255,255,0.15)',color:'white',border:'1.5px solid rgba(255,255,255,0.4)',
              padding:'8px 18px',borderRadius:10,cursor:'pointer',fontSize:14,fontWeight:600
            }} onClick={()=>setEditing(true)}>✏️ Editar datos</button>
          )}
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">⚠️ {error}<button onClick={()=>setError('')} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer'}}>✕</button></div>}

      {!editing ? (
        <>
          {/* ── Contactos de emergencia ── */}
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:16,fontWeight:800,color:'#1a202c',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
              🚨 Contactos de Emergencia
            </h2>
            <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
              <ContactCard
                icon="👨‍👩‍👦" title="Apoderado"
                nombre={`${profile.apoderado_apellidos||''} ${profile.apoderado_nombre||''}`.trim()||null}
                dni={profile.apoderado_dni}
                telefono={profile.apoderado_telefono}
                email={profile.apoderado_email}
                parentesco={profile.apoderado_parentesco}
                color="#1a56db"
              />
              <ContactCard
                icon="👨" title="Padre"
                nombre={profile.padre_nombre}
                dni={profile.padre_dni}
                telefono={profile.padre_telefono}
                email={profile.padre_email}
                color="#059669"
              />
              <ContactCard
                icon="👩" title="Madre"
                nombre={profile.madre_nombre}
                dni={profile.madre_dni}
                telefono={profile.madre_telefono}
                email={profile.madre_email}
                color="#9333ea"
              />
            </div>
            {!profile.apoderado_telefono && !profile.padre_telefono && !profile.madre_telefono && (
              <div style={{
                background:'#fff7ed',border:'1.5px solid #fed7aa',borderRadius:12,
                padding:'14px 18px',display:'flex',alignItems:'center',gap:10,fontSize:13,color:'#92400e'
              }}>
                ⚠️ No hay celulares de emergencia registrados. Presiona <strong>"Editar datos"</strong> para agregarlos.
              </div>
            )}
          </div>

          {/* ── Datos personales ── */}
          <div className="card" style={{marginBottom:16}}>
            <h3 style={{fontSize:14,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:16}}>Datos del Estudiante</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'10px 24px'}}>
              {[
                ['Apellido Paterno', profile.apellido_paterno],
                ['Apellido Materno', profile.apellido_materno],
                ['Nombres', profile.nombre],
                ['DNI', profile.dni],
                ['Sexo', profile.sexo],
                ['Fecha Nacimiento', fmt(profile.fecha_nacimiento)],
                ['Grado', profile.grado?.trim()],
                ['Sección', profile.seccion?.trim()],
                ['Código', profile.codigo_estudiante],
                ['Teléfono', profile.telefono],
                ['Email', profile.email],
              ].map(([label, val]) => (
                <div key={label} style={{borderBottom:'1px solid #f1f5f9',paddingBottom:8}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',marginBottom:2}}>{label}</div>
                  <div style={{fontSize:14,color:val?'#1a202c':'#cbd5e1'}}>{val||'—'}</div>
                </div>
              ))}
            </div>
            {profile.direccion && (
              <div style={{marginTop:12,borderTop:'1px solid #f1f5f9',paddingTop:12}}>
                <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',marginBottom:2}}>Dirección</div>
                <div style={{fontSize:14,color:'#1a202c'}}>🏠 {profile.direccion}</div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── FORMULARIO EDICIÓN ── */
        <div>
          {/* Contacto del estudiante */}
          <div className="card" style={{marginBottom:16}}>
            <h3 style={{fontSize:14,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:16}}>
              📱 Mi Contacto
            </h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
              <Field label="Teléfono / Celular"><input {...inp('telefono')} placeholder="999 999 999"/></Field>
              <Field label="Email"><input {...inp('email','email')} placeholder="correo@ejemplo.com"/></Field>
              <Field label="Dirección"><input {...inp('direccion')} placeholder="Calle, número, distrito"/></Field>
            </div>
          </div>

          {/* Apoderado */}
          <div className="card" style={{marginBottom:16,borderTop:'3px solid #1a56db'}}>
            <h3 style={{fontSize:14,fontWeight:700,color:'#1a56db',textTransform:'uppercase',letterSpacing:1,marginBottom:16}}>
              👨‍👩‍👦 Apoderado Principal
            </h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
              <Field label="Apellidos del Apoderado"><input {...inp('apoderado_apellidos')} placeholder="Apellido Paterno Materno"/></Field>
              <Field label="Nombres del Apoderado"><input {...inp('apoderado_nombre')} placeholder="Nombres completos"/></Field>
              <Field label="DNI"><input {...inp('apoderado_dni')} placeholder="12345678" maxLength={12}/></Field>
              <Field label="Parentesco">
                <select className="form-control" value={form.apoderado_parentesco||''} onChange={e=>set('apoderado_parentesco',e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {PARENTESCOS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="📞 Celular (emergencia)"><input {...inp('apoderado_telefono')} placeholder="999 999 999"/></Field>
              <Field label="Email"><input {...inp('apoderado_email','email')} placeholder="apoderado@email.com"/></Field>
            </div>
          </div>

          {/* Padre y Madre */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div className="card" style={{borderTop:'3px solid #059669'}}>
              <h3 style={{fontSize:14,fontWeight:700,color:'#059669',textTransform:'uppercase',letterSpacing:1,marginBottom:16}}>👨 Padre</h3>
              <Field label="Apellidos y Nombres"><input {...inp('padre_nombre')} placeholder="Apellidos y nombres"/></Field>
              <div style={{height:12}}/>
              <Field label="DNI"><input {...inp('padre_dni')} placeholder="12345678" maxLength={12}/></Field>
              <div style={{height:12}}/>
              <Field label="📞 Celular"><input {...inp('padre_telefono')} placeholder="999 999 999"/></Field>
              <div style={{height:12}}/>
              <Field label="Email"><input {...inp('padre_email','email')} placeholder="padre@email.com"/></Field>
            </div>
            <div className="card" style={{borderTop:'3px solid #9333ea'}}>
              <h3 style={{fontSize:14,fontWeight:700,color:'#9333ea',textTransform:'uppercase',letterSpacing:1,marginBottom:16}}>👩 Madre</h3>
              <Field label="Apellidos y Nombres"><input {...inp('madre_nombre')} placeholder="Apellidos y nombres"/></Field>
              <div style={{height:12}}/>
              <Field label="DNI"><input {...inp('madre_dni')} placeholder="12345678" maxLength={12}/></Field>
              <div style={{height:12}}/>
              <Field label="📞 Celular"><input {...inp('madre_telefono')} placeholder="999 999 999"/></Field>
              <div style={{height:12}}/>
              <Field label="Email"><input {...inp('madre_email','email')} placeholder="madre@email.com"/></Field>
            </div>
          </div>

          <div style={{display:'flex',gap:10,marginBottom:40}}>
            <button className="btn btn-secondary" onClick={()=>{setEditing(false);setForm(profile);}}>Cancelar</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving} style={{flex:1,fontSize:15}}>
              {saving?'⏳ Guardando...':'💾 Guardar todos los cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
