import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';
const PARENTESCOS = ['Padre','Madre','Abuelo/a','Tío/a','Hermano/a','Tutor legal','Otro'];

function Avatar({ src, nombre, apellido, sexo, size=80 }) {
  const initials = `${(apellido||'')[0]||''}${(nombre||'')[0]||''}`.toUpperCase();
  const gradient = sexo==='Mujer'?'linear-gradient(135deg,#f472b6,#c084fc)':'linear-gradient(135deg,#60a5fa,#34d399)';
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:src?'transparent':gradient,
      display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.36,fontWeight:800,
      color:'white',overflow:'hidden',flexShrink:0,boxShadow:'0 2px 12px rgba(0,0,0,0.2)',
      border:'3px solid white'}}>
      {src
        ? <img src={src} alt="foto" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>
        : initials}
    </div>
  );
}

function CallBtn({ phone, label }) {
  if (!phone) return <span style={{color:'#cbd5e1',fontSize:12}}>Sin celular</span>;
  return (
    <a href={`tel:${phone}`} style={{
      display:'inline-flex',alignItems:'center',gap:6,
      background:'linear-gradient(135deg,#059669,#047857)',color:'white',
      padding:'6px 14px',borderRadius:8,textDecoration:'none',
      fontSize:13,fontWeight:700,boxShadow:'0 2px 8px rgba(5,150,105,0.3)'
    }}>
      📞 {phone}
    </a>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{display:'flex',gap:8,padding:'6px 0',borderBottom:'1px solid #f8fafc',alignItems:'flex-start'}}>
      <span style={{fontSize:11,fontWeight:600,color:'#94a3b8',minWidth:110,paddingTop:2,textTransform:'uppercase',letterSpacing:0.3}}>{label}</span>
      <span style={{fontSize:13,color:value?'#1a202c':'#cbd5e1',flex:1}}>{value||'—'}</span>
    </div>
  );
}

export default function StudentDetail({ studentId, onClose, onSaved }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    axios.get(`${API}/api/users/${studentId}`).then(r=>{setStudent(r.data);setForm(r.data);setLoading(false);})
         .catch(()=>setLoading(false));
  }, [studentId]);

  const set = (f,v) => setForm(p=>({...p,[f]:v}));
  const inp = (field, type='text') => ({
    className:'form-control', type, style:{fontSize:13},
    value: form[field]||'', onChange: e=>set(field,e.target.value)
  });

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const r = await axios.put(`${API}/api/users/${studentId}`, form);
      setStudent(r.data); setForm(r.data); setEditing(false);
      setSuccess('✅ Guardado'); setTimeout(()=>setSuccess(''),2500);
      if (onSaved) onSaved(r.data);
    } catch(e) { setError(e.response?.data?.error||'Error al guardar'); }
    setSaving(false);
  };

  const fmt = d => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'}); } catch { return d; }
  };

  const edad = d => {
    if (!d) return '';
    return `${Math.floor((new Date()-new Date(d))/31557600000)} años`;
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:680,padding:0,overflow:'hidden'}}>
        {loading ? (
          <div className="loading" style={{padding:60}}><div className="spinner"/></div>
        ) : !student ? (
          <div className="alert alert-error" style={{margin:20}}>Error al cargar</div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              background:'linear-gradient(135deg,#0f172a,#1e3a5f,#1a56db)',
              padding:'20px 24px',display:'flex',alignItems:'center',gap:16,position:'relative'
            }}>
              <Avatar src={student.foto_url} nombre={student.nombre} apellido={student.apellido_paterno} sexo={student.sexo} size={72}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:18,color:'white',lineHeight:1.2}}>
                  {student.apellido_paterno} {student.apellido_materno}
                </div>
                <div style={{fontSize:14,color:'rgba(255,255,255,0.8)',marginTop:2}}>{student.nombre}</div>
                <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
                  <span style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'2px 10px',fontSize:11,color:'white',fontWeight:600}}>
                    {student.grado?.trim()} "{student.seccion?.trim()}"
                  </span>
                  <span style={{background:'rgba(255,255,255,0.15)',borderRadius:20,padding:'2px 10px',fontSize:11,color:'white',fontWeight:600}}>
                    {student.sexo} · {edad(student.fecha_nacimiento)}
                  </span>
                </div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {!editing
                  ? <button className="btn btn-outline btn-sm" style={{color:'white',borderColor:'rgba(255,255,255,0.4)',background:'rgba(255,255,255,0.1)'}} onClick={()=>setEditing(true)}>✏️ Editar</button>
                  : <>
                      <button className="btn btn-secondary btn-sm" onClick={()=>{setEditing(false);setForm(student);setError('');}}>Cancelar</button>
                      <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving?'⏳':'💾 Guardar'}</button>
                    </>
                }
                <button className="modal-close" onClick={onClose}>✕</button>
              </div>
            </div>

            {/* Body */}
            <div style={{padding:'20px 24px',overflowY:'auto',maxHeight:'calc(90vh-160px)'}}>
              {error && <div className="alert alert-error" style={{marginBottom:12}}>⚠️ {error}</div>}
              {success && <div className="alert alert-success" style={{marginBottom:12}}>{success}</div>}

              {!editing ? (
                <>
                  {/* Emergency contacts */}
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>
                      🚨 Contactos de Emergencia
                    </div>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      {[
                        {label:'Apoderado',icon:'👨‍👩‍👦',color:'#1a56db',
                          nombre:`${student.apoderado_apellidos||''} ${student.apoderado_nombre||''}`.trim(),
                          tel:student.apoderado_telefono,par:student.apoderado_parentesco},
                        {label:'Padre',icon:'👨',color:'#059669',nombre:student.padre_nombre,tel:student.padre_telefono},
                        {label:'Madre',icon:'👩',color:'#9333ea',nombre:student.madre_nombre,tel:student.madre_telefono},
                      ].map(c=>(
                        <div key={c.label} style={{
                          flex:1,minWidth:160,background:c.tel?`${c.color}08`:'#f8fafc',
                          border:`1.5px solid ${c.tel?c.color+'30':'#e2e8f0'}`,
                          borderRadius:12,padding:'12px 14px'
                        }}>
                          <div style={{fontWeight:700,fontSize:12,color:c.color,marginBottom:4}}>
                            {c.icon} {c.label}{c.par&&` · ${c.par}`}
                          </div>
                          {c.nombre&&<div style={{fontSize:12,color:'#374151',marginBottom:6,fontWeight:600}}>{c.nombre}</div>}
                          <CallBtn phone={c.tel}/>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>
                        Datos del Estudiante
                      </div>
                      <InfoRow label="DNI" value={student.dni}/>
                      <InfoRow label="Fecha Nac." value={fmt(student.fecha_nacimiento)}/>
                      <InfoRow label="Código" value={student.codigo_estudiante}/>
                      <InfoRow label="Teléfono" value={student.telefono}/>
                      <InfoRow label="Email" value={student.email}/>
                      <InfoRow label="Dirección" value={student.direccion}/>
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>
                        Apoderado
                      </div>
                      <InfoRow label="Apellidos" value={student.apoderado_apellidos}/>
                      <InfoRow label="Nombres" value={student.apoderado_nombre}/>
                      <InfoRow label="DNI" value={student.apoderado_dni}/>
                      <InfoRow label="Celular" value={student.apoderado_telefono}/>
                      <InfoRow label="Email" value={student.apoderado_email}/>
                      <div style={{marginTop:16,fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Padre</div>
                      <InfoRow label="Nombre" value={student.padre_nombre}/>
                      <InfoRow label="DNI" value={student.padre_dni}/>
                      <InfoRow label="Celular" value={student.padre_telefono}/>
                      <div style={{marginTop:16,fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Madre</div>
                      <InfoRow label="Nombre" value={student.madre_nombre}/>
                      <InfoRow label="DNI" value={student.madre_dni}/>
                      <InfoRow label="Celular" value={student.madre_telefono}/>
                    </div>
                  </div>
                </>
              ) : (
                /* Formulario edición admin */
                <>
                  <div style={{fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Datos Académicos</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                    {[['nombre','Nombres'],['apellido_paterno','Ap. Paterno'],['apellido_materno','Ap. Materno']].map(([f,l])=>(
                      <div key={f} className="form-group" style={{marginBottom:0}}>
                        <label className="form-label" style={{fontSize:11}}>{l}</label>
                        <input {...inp(f)}/>
                      </div>
                    ))}
                    <div className="form-group" style={{marginBottom:0}}>
                      <label className="form-label" style={{fontSize:11}}>Grado</label>
                      <select className="form-control" style={{fontSize:13}} value={form.grado?.trim()||''} onChange={e=>set('grado',e.target.value)}>
                        <option value="">—</option>
                        {['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO','SEXTO'].map(g=><option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label className="form-label" style={{fontSize:11}}>Sección</label>
                      <select className="form-control" style={{fontSize:13}} value={form.seccion?.trim()||''} onChange={e=>set('seccion',e.target.value)}>
                        <option value="">—</option>
                        {['A','B','C','D','E'].map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label className="form-label" style={{fontSize:11}}>Sexo</label>
                      <select className="form-control" style={{fontSize:13}} value={form.sexo||''} onChange={e=>set('sexo',e.target.value)}>
                        <option value="">—</option>
                        <option>Hombre</option><option>Mujer</option>
                      </select>
                    </div>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label className="form-label" style={{fontSize:11}}>Fecha Nacimiento</label>
                      <input {...inp('fecha_nacimiento','date')}/>
                    </div>
                    <div className="form-group" style={{marginBottom:0,gridColumn:'span 2'}}>
                      <label className="form-label" style={{fontSize:11}}>Código Estudiante</label>
                      <input {...inp('codigo_estudiante')}/>
                    </div>
                  </div>

                  <div style={{fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Contacto y Familia</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                    {[['telefono','Teléfono alumno'],['email','Email alumno'],['direccion','Dirección']].map(([f,l])=>(
                      <div key={f} className="form-group" style={{marginBottom:0}}>
                        <label className="form-label" style={{fontSize:11}}>{l}</label>
                        <input {...inp(f)}/>
                      </div>
                    ))}
                  </div>

                  {[
                    {title:'👨‍👩‍👦 Apoderado',color:'#1a56db',fields:[
                      ['apoderado_apellidos','Apellidos'],['apoderado_nombre','Nombres'],
                      ['apoderado_dni','DNI'],['apoderado_parentesco','Parentesco',true],
                      ['apoderado_telefono','📞 Celular'],['apoderado_email','Email'],
                    ]},
                    {title:'👨 Padre',color:'#059669',fields:[
                      ['padre_nombre','Apellidos y Nombres'],['padre_dni','DNI'],
                      ['padre_telefono','📞 Celular'],['padre_email','Email'],
                    ]},
                    {title:'👩 Madre',color:'#9333ea',fields:[
                      ['madre_nombre','Apellidos y Nombres'],['madre_dni','DNI'],
                      ['madre_telefono','📞 Celular'],['madre_email','Email'],
                    ]},
                  ].map(sec=>(
                    <div key={sec.title} style={{borderLeft:`3px solid ${sec.color}`,paddingLeft:12,marginBottom:16}}>
                      <div style={{fontSize:12,fontWeight:700,color:sec.color,marginBottom:10}}>{sec.title}</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
                        {sec.fields.map(([f,l,isSelect])=>(
                          <div key={f} className="form-group" style={{marginBottom:0}}>
                            <label className="form-label" style={{fontSize:11}}>{l}</label>
                            {isSelect
                              ? <select className="form-control" style={{fontSize:13}} value={form[f]||''} onChange={e=>set(f,e.target.value)}>
                                  <option value="">—</option>
                                  {PARENTESCOS.map(p=><option key={p} value={p}>{p}</option>)}
                                </select>
                              : <input {...inp(f)}/>
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
