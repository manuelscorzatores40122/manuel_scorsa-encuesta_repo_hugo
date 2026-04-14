import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import StudentDetail from './StudentDetail';

const API = process.env.REACT_APP_API_URL || '';

function Avatar({ src, nombre, apellido, sexo, size=36 }) {
  const initials = `${(apellido||'')[0]||''}${(nombre||'')[0]||''}`.toUpperCase();
  const bg = sexo==='Mujer'?'linear-gradient(135deg,#f472b6,#c084fc)':'linear-gradient(135deg,#60a5fa,#34d399)';
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:src?'transparent':bg,
      display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,
      color:'white',overflow:'hidden',flexShrink:0,border:'2px solid #e2e8f0'}}>
      {src?<img src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:initials}
    </div>
  );
}

function CallBadge({ phone }) {
  if (!phone) return <span style={{color:'#cbd5e1',fontSize:11}}>—</span>;
  return (
    <a href={`tel:${phone}`} style={{
      display:'inline-flex',alignItems:'center',gap:4,
      background:'#d1fae5',color:'#065f46',padding:'3px 10px',
      borderRadius:20,fontSize:12,fontWeight:700,textDecoration:'none',
      border:'1px solid #a7f3d0',whiteSpace:'nowrap'
    }}>📞 {phone}</a>
  );
}

export default function UsersManager({ onStudentCount }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [search, setSearch] = useState('');
  const [filterGrado, setFilterGrado] = useState('');
  const [filterSeccion, setFilterSeccion] = useState('');
  const [filterSinCel, setFilterSinCel] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({dni:'',nombre:'',apellido_paterno:'',apellido_materno:'',grado:'',seccion:''});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(()=>{ loadUsers(); },[]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/users`);
      setUsers(r.data);
      if (onStudentCount) onStudentCount(r.data.filter(u=>u.role==='student').length);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const cleanCel = (v) => {
    if (!v) return null;
    v = v.trim();
    if (v.includes('/')) {
      const partes = v.split('/').map(p=>p.trim());
      for (const p of partes) {
        const d = p.replace(/\D/g,'');
        if (d.startsWith('9') && d.length===9) return d;
      }
      const last = partes[partes.length-1].replace(/\D/g,'');
      return last.substring(0,20)||null;
    }
    const clean = v.replace(/[^\d\-\+\s]/g,'').trim();
    return clean.substring(0,20)||null;
  };

  const parseFecha = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim();
    if (s.includes('/')) {
      const p=s.split('/');
      if(p.length===3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
    }
    if (typeof raw==='number') {
      try { const d=XLSX.SSF.parse_date_code(raw); if(d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; } catch(e){}
    }
    return null;
  };

  const splitApod = (full) => {
    if (!full) return [null,null];
    const parts=full.split(' ');
    if(parts.length>=3) return [parts.slice(0,2).join(' '),parts.slice(2).join(' ')];
    if(parts.length===2) return [parts[0],parts[1]];
    return [null,full];
  };

  const handleExcelImport = async (e) => {
    const file=e.target.files[0]; if(!file) return;
    setImporting(true); setImportResult(null); setError('');
    try {
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});

      // Detectar si es PRIMARIA o SECUNDARIA por las columnas
      let isPrimaria=false;
      for(let i=0;i<15;i++){
        const r=rows[i]||[];
        if(r[19]==='PADRE' || String(r[19]).includes('PADRE')) { isPrimaria=true; break; }
        if(r[18]==='PADRE' || String(r[18]).includes('PADRE')) { isPrimaria=false; break; }
      }

      const cm = isPrimaria
        ? {ITEM:1,GRADO:2,SECCION:3,DNI:5,CODIGO:7,AP_PAT:8,AP_MAT:9,NOMBRES:10,SEXO:11,FECHA_NAC:13,
           PADRE:19,PADRE_DNI:32,PADRE_CEL:35,MADRE:36,MADRE_DNI:40,MADRE_CEL:43,
           APOD:44,APOD_PARENTESCO:46,APOD_DNI:48,APOD_CEL:51}
        : {ITEM:1,GRADO:2,SECCION:3,DNI:5,CODIGO:7,AP_PAT:8,AP_MAT:9,NOMBRES:10,SEXO:11,FECHA_NAC:12,
           PADRE:18,PADRE_DNI:31,PADRE_CEL:34,MADRE:35,MADRE_DNI:39,MADRE_CEL:42,
           APOD:43,APOD_PARENTESCO:45,APOD_DNI:47,APOD_CEL:50};

      const g=(row,key)=>{const idx=cm[key];if(idx===undefined||idx>=row.length||row[idx]===null)return null;const v=String(row[idx]).trim();return v||null;};

      const students=[];
      for(let i=12;i<rows.length;i++){
        const row=rows[i];
        if(!row||row[cm.ITEM]===null||row[cm.ITEM]==='') continue;
        try{parseInt(String(row[cm.ITEM]).trim())}catch{continue}
        const dni=g(row,'DNI'); const nombre=g(row,'NOMBRES');
        if(!dni||!nombre) continue;
        const [apAps,apNom]=splitApod(g(row,'APOD'));
        students.push({
          dni,nombre,apellido_paterno:g(row,'AP_PAT'),apellido_materno:g(row,'AP_MAT'),
          grado:g(row,'GRADO'),seccion:g(row,'SECCION'),sexo:g(row,'SEXO'),
          fecha_nacimiento:parseFecha(row[cm.FECHA_NAC]),codigo_estudiante:g(row,'CODIGO'),
          padre_nombre:g(row,'PADRE'),padre_dni:g(row,'PADRE_DNI'),padre_telefono:cleanCel(g(row,'PADRE_CEL')),
          madre_nombre:g(row,'MADRE'),madre_dni:g(row,'MADRE_DNI'),madre_telefono:cleanCel(g(row,'MADRE_CEL')),
          apoderado_nombre:apNom,apoderado_apellidos:apAps,
          apoderado_dni:g(row,'APOD_DNI'),apoderado_parentesco:g(row,'APOD_PARENTESCO'),
          apoderado_telefono:cleanCel(g(row,'APOD_CEL')),
        });
      }
      if(!students.length){setError('No se encontraron alumnos válidos');setImporting(false);return;}
      const res=await axios.post(`${API}/api/users/import`,{students});
      setImportResult({...res.data,total:students.length});
      loadUsers();
    } catch(e){ setError('Error: '+(e.response?.data?.error||e.message)); }
    finally{ setImporting(false); if(fileRef.current) fileRef.current.value=''; }
  };

  const handleAdd = async () => {
    if(!newUser.dni||!newUser.nombre) return setError('DNI y nombres requeridos');
    setSaving(true); setError('');
    try{ await axios.post(`${API}/api/users`,newUser); setShowAdd(false); setNewUser({dni:'',nombre:'',apellido_paterno:'',apellido_materno:'',grado:'',seccion:''}); loadUsers(); }
    catch(e){ setError(e.response?.data?.error||'Error al guardar'); }
    finally{ setSaving(false); }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('¿Eliminar este estudiante?')) return;
    try{ await axios.delete(`${API}/api/users/${id}`); loadUsers(); }catch(e){ alert('Error al eliminar'); }
  };

  const handleReset = async (u) => {
    if(!window.confirm(`¿Restablecer contraseña de ${u.nombre} a su DNI?`)) return;
    try{ await axios.post(`${API}/api/users/${u.id}/reset-password`); alert(`Contraseña restablecida: ${u.dni}`); }catch(e){ alert('Error'); }
  };

  const grados=[...new Set(users.filter(u=>u.role==='student'&&u.grado).map(u=>u.grado?.trim()))].sort();
  const secciones=[...new Set(users.filter(u=>u.role==='student'&&u.seccion).map(u=>u.seccion?.trim()))].sort();

  const filtered=users.filter(u=>{
    if(u.role!=='student') return false;
    const txt=(u.nombre+' '+u.apellido_paterno+' '+u.apellido_materno+' '+u.dni+' '+(u.apoderado_nombre||'')).toLowerCase();
    if(search&&!txt.includes(search.toLowerCase())) return false;
    if(filterGrado&&u.grado?.trim()!==filterGrado) return false;
    if(filterSeccion&&u.seccion?.trim()!==filterSeccion) return false;
    if(filterSinCel&&(u.apoderado_telefono||u.padre_telefono||u.madre_telefono)) return false;
    return true;
  });

  const sinCelTotal=users.filter(u=>u.role==='student'&&!u.apoderado_telefono&&!u.padre_telefono&&!u.madre_telefono).length;

  return (
    <div>
      {error&&<div className="alert alert-error">⚠️ {error}<button onClick={()=>setError('')} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',fontSize:16}}>✕</button></div>}
      {importResult&&<div className="alert alert-success">✅ {importResult.message}<button onClick={()=>setImportResult(null)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',fontSize:16}}>✕</button></div>}

      {/* Import */}
      <div className="card" style={{marginBottom:16}}>
        <h3 style={{fontWeight:700,fontSize:14,marginBottom:8}}>📥 Importar desde Excel (SIAGIE)</h3>
        <p style={{fontSize:13,color:'#718096',marginBottom:12}}>Importa el reporte de Padres y Estudiantes. Detecta automáticamente si es Primaria o Secundaria.</p>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} style={{display:'none'}} id="xl-up"/>
          <label htmlFor="xl-up" className="btn btn-primary" style={{cursor:importing?'wait':'pointer'}}>
            {importing?'⏳ Importando...':'📂 Seleccionar Excel'}
          </label>
          {sinCelTotal>0&&(
            <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:8,padding:'6px 12px',fontSize:12,color:'#92400e'}}>
              ⚠️ {sinCelTotal} alumnos sin celular de emergencia
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <input className="form-control" placeholder="🔍 Buscar nombre, DNI, apoderado..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:260,flex:1}}/>
        <select className="form-control" value={filterGrado} onChange={e=>setFilterGrado(e.target.value)} style={{maxWidth:130}}>
          <option value="">Todos los grados</option>
          {grados.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
        <select className="form-control" value={filterSeccion} onChange={e=>setFilterSeccion(e.target.value)} style={{maxWidth:110}}>
          <option value="">Todas las secciones</option>
          {secciones.map(s=><option key={s} value={s}>Sección {s}</option>)}
        </select>
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#374151',cursor:'pointer',whiteSpace:'nowrap'}}>
          <input type="checkbox" checked={filterSinCel} onChange={e=>setFilterSinCel(e.target.checked)} style={{accentColor:'#dc2626'}}/>
          Sin celular
        </label>
        <span style={{fontSize:13,color:'#718096',whiteSpace:'nowrap'}}>{filtered.length} alumnos</span>
        <button className="btn btn-outline btn-sm" onClick={()=>setShowAdd(!showAdd)}>➕ Agregar</button>
      </div>

      {showAdd&&(
        <div className="card" style={{marginBottom:16,border:'2px solid #1a56db'}}>
          <h3 style={{fontWeight:700,fontSize:14,marginBottom:16}}>Agregar Estudiante</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
            {[['dni','DNI *'],['nombre','Nombres *'],['apellido_paterno','Ap. Paterno'],['apellido_materno','Ap. Materno']].map(([f,l])=>(
              <div key={f} className="form-group" style={{marginBottom:0}}>
                <label className="form-label" style={{fontSize:12}}>{l}</label>
                <input className="form-control" style={{fontSize:13}} value={newUser[f]} onChange={e=>setNewUser(p=>({...p,[f]:e.target.value}))}/>
              </div>
            ))}
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label" style={{fontSize:12}}>Grado</label>
              <select className="form-control" style={{fontSize:13}} value={newUser.grado} onChange={e=>setNewUser(p=>({...p,grado:e.target.value}))}>
                <option value="">—</option>
                {['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO','SEXTO'].map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label" style={{fontSize:12}}>Sección</label>
              <select className="form-control" style={{fontSize:13}} value={newUser.seccion} onChange={e=>setNewUser(p=>({...p,seccion:e.target.value}))}>
                <option value="">—</option>
                {['A','B','C','D','E'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:14}}>
            <button className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Guardando...':'💾 Guardar'}</button>
          </div>
        </div>
      )}

      {loading?(
        <div className="loading"><div className="spinner"/>Cargando...</div>
      ):(
        <div className="card" style={{padding:0}}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Grado / Sec.</th>
                  <th>🚨 Apoderado — Emergencia</th>
                  <th>👨 Padre</th>
                  <th>👩 Madre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0?(
                  <tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'#94a3b8'}}>
                    {search||filterGrado||filterSeccion||filterSinCel?'Sin resultados':'No hay estudiantes'}
                  </td></tr>
                ):filtered.map(u=>(
                  <tr key={u.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <Avatar src={u.foto_url} nombre={u.nombre} apellido={u.apellido_paterno} sexo={u.sexo}/>
                        <div>
                          <div style={{fontWeight:700,fontSize:13}}>{u.apellido_paterno} {u.apellido_materno}</div>
                          <div style={{fontSize:12,color:'#718096'}}>{u.nombre}</div>
                          <div style={{fontSize:11,color:'#94a3b8'}}>DNI: {u.dni}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{whiteSpace:'nowrap'}}>
                      <span className="badge badge-info">{u.grado?.trim()}</span>{' '}
                      <span className="badge badge-gray">"{u.seccion?.trim()}"</span>
                    </td>
                    <td>
                      {u.apoderado_nombre||u.apoderado_apellidos?(
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}}>
                            {u.apoderado_apellidos} {u.apoderado_nombre}
                            {u.apoderado_parentesco&&<span style={{fontSize:10,color:'#718096',marginLeft:4}}>({u.apoderado_parentesco})</span>}
                          </div>
                          <CallBadge phone={u.apoderado_telefono}/>
                        </div>
                      ):<span style={{color:'#cbd5e1',fontSize:12}}>Sin apoderado</span>}
                    </td>
                    <td>
                      {u.padre_nombre&&<div style={{fontSize:12,color:'#374151',marginBottom:4,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.padre_nombre}</div>}
                      <CallBadge phone={u.padre_telefono}/>
                    </td>
                    <td>
                      {u.madre_nombre&&<div style={{fontSize:12,color:'#374151',marginBottom:4,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.madre_nombre}</div>}
                      <CallBadge phone={u.madre_telefono}/>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-outline btn-sm" onClick={()=>setSelectedId(u.id)}>👁 Ver</button>
                        <button className="btn btn-secondary btn-sm" onClick={()=>handleReset(u)} title="Restablecer contraseña">🔑</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(u.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedId&&(
        <StudentDetail
          studentId={selectedId}
          onClose={()=>setSelectedId(null)}
          onSaved={updated=>{setUsers(prev=>prev.map(u=>u.id===updated.id?updated:u));setSelectedId(null);}}
        />
      )}
    </div>
  );
}
