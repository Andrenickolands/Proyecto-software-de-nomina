import { useEffect, useState } from 'react';
import { api } from '../../api/index.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useAuth } from '../../context/Auth.jsx';
import { useAvisos } from '../../context/Avisos.jsx';
import { Boton, BotonIcono, Campo, Cargando, Confirmar, ErrorCarga, Etiqueta, Panel, InputClave } from '../../components/ui.jsx';

export function Empresa() {
  const { esAdmin } = useAuth();
  const avisar = useAvisos();
  const datos = useCarga(() => api.empresa.obtener(), []);
  const [form, setForm] = useState(null);
  useEffect(() => { if (datos.datos) setForm(datos.datos); }, [datos.datos]);
  if (datos.error) return <ErrorCarga error={datos.error} reintentar={datos.recargar} />;
  if (!form) return <Cargando />;
  const guardar = async (e) => {
    e.preventDefault();
    try { await api.empresa.guardar(form); avisar('Datos de la empresa guardados.'); } catch (er) { avisar(er.message, 'error'); }
  };
  return (
    <form className="form form--angosto" onSubmit={guardar}>
      <p className="texto-suave">Aparecen en los desprendibles de pago.</p>
      <Campo etiqueta="Razón social">{(id) => <input id={id} value={form.razon_social} disabled={!esAdmin} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />}</Campo>
      <div className="form__fila">
        <Campo etiqueta="NIT">{(id) => <input id={id} value={form.nit} disabled={!esAdmin} onChange={(e) => setForm({ ...form, nit: e.target.value })} />}</Campo>
        <Campo etiqueta="Ciudad">{(id) => <input id={id} value={form.ciudad} disabled={!esAdmin} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />}</Campo>
      </div>
      {esAdmin && <div><Boton variante="primario" type="submit">Guardar datos</Boton></div>}
    </form>
  );
}

export function MiCuenta() {
  const avisar = useAvisos();
  const [f, setF] = useState({ actual: '', nueva: '', repetir: '' });
  const [error, setError] = useState('');
  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (f.nueva !== f.repetir) return setError('Las contraseñas nuevas no coinciden.');
    try {
      await api.auth.cambiarPassword(f.actual, f.nueva);
      setF({ actual: '', nueva: '', repetir: '' });
      avisar('Contraseña actualizada.');
    } catch (er) { setError(er.message); }
    return undefined;
  };
  return (
    <form className="form form--angosto" onSubmit={enviar}>
      <Campo etiqueta="Contraseña actual">{(id) => <InputClave id={id} autoComplete="current-password" value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} />}</Campo>
      <Campo etiqueta="Contraseña nueva" ayuda="Mínimo 10 caracteres, con letras y números.">{(id) => <InputClave id={id} autoComplete="new-password" value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} />}</Campo>
      <Campo etiqueta="Repite la contraseña nueva">{(id) => <InputClave id={id} autoComplete="new-password" value={f.repetir} onChange={(e) => setF({ ...f, repetir: e.target.value })} />}</Campo>
      {error && <p className="alerta alerta--error" role="alert">{error}</p>}
      <div><Boton variante="primario" type="submit">Cambiar contraseña</Boton></div>
    </form>
  );
}

export function Usuarios() {
  const { usuario } = useAuth();
  const avisar = useAvisos();
  const lista = useCarga(() => api.usuarios.listar(), []);
  const [nuevo, setNuevo] = useState(null);
  const [borrar, setBorrar] = useState(null);
  if (lista.error) return <ErrorCarga error={lista.error} reintentar={lista.recargar} />;
  if (!lista.datos) return <Cargando />;
  const crear = async () => {
    try { await api.usuarios.crear(nuevo); avisar('Usuario creado.'); setNuevo(null); lista.recargar(); } catch (e) { avisar(e.message, 'error'); }
  };
  return (
    <section>
      <div className="bloque__cabeza">
        <p className="texto-suave">Los usuarios de solo consulta pueden ver todo pero no cambian datos ni liquidan.</p>
        <Boton variante="primario" icono="mas" onClick={() => setNuevo({ nombre: '', email: '', password: '', rol: 'consulta' })}>Agregar usuario</Boton>
      </div>
      <ul className="usuarios">
        {lista.datos.map((u) => (
          <li key={u.id}>
            <div><strong>{u.nombre}</strong><span>{u.email}</span></div>
            <Etiqueta tono={u.rol === 'admin' ? 'acento' : 'neutro'}>{u.rol === 'admin' ? 'Administrador' : 'Solo consulta'}</Etiqueta>
            {u.id !== usuario.id ? <BotonIcono icono="borrar" etiqueta={`Eliminar a ${u.nombre}`} onClick={() => setBorrar(u)} /> : <span className="texto-suave">Tú</span>}
          </li>
        ))}
      </ul>
      <Panel abierto={Boolean(nuevo)} titulo="Nuevo usuario" alCerrar={() => setNuevo(null)} pie={<><Boton onClick={() => setNuevo(null)}>Cancelar</Boton><Boton variante="primario" onClick={crear}>Crear usuario</Boton></>}>
        {nuevo && (
          <div className="form">
            <Campo etiqueta="Nombre">{(id) => <input id={id} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />}</Campo>
            <Campo etiqueta="Correo">{(id) => <input id={id} type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />}</Campo>
            <Campo etiqueta="Contraseña inicial" ayuda="Mínimo 10 caracteres, con letras y números.">{(id) => <InputClave id={id} autoComplete="new-password" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} />}</Campo>
            <Campo etiqueta="Permisos">{(id) => (
              <select id={id} value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
                <option value="consulta">Solo consulta</option>
                <option value="admin">Administrador</option>
              </select>
            )}</Campo>
          </div>
        )}
      </Panel>
      <Confirmar abierto={Boolean(borrar)} peligro titulo={`¿Eliminar a ${borrar?.nombre}?`} texto="Ya no podrá ingresar." accion="Eliminar usuario"
        alConfirmar={async () => { try { await api.usuarios.eliminar(borrar.id); setBorrar(null); lista.recargar(); } catch (e) { avisar(e.message, 'error'); } }} alCerrar={() => setBorrar(null)} />
    </section>
  );
}

const ACCIONES = {
  ingreso: 'Ingresó', liquidar: 'Liquidó una quincena', reabrir: 'Reabrió una quincena', generar_asistencia: 'Llenó asistencia',
  crear_colaborador: 'Creó un colaborador', actualizar_colaborador: 'Editó un colaborador', eliminar_colaborador: 'Eliminó un colaborador',
  actualizar_parametros: 'Cambió parámetros legales', crear_parametros: 'Creó parámetros legales', eliminar_parametros: 'Eliminó parámetros legales',
  agregar_novedad: 'Agregó una novedad', eliminar_novedad: 'Eliminó una novedad', cambio_password: 'Cambió su contraseña',
};

export function Auditoria() {
  const lista = useCarga(() => api.auditoria(), []);
  if (lista.error) return <ErrorCarga error={lista.error} reintentar={lista.recargar} />;
  if (!lista.datos) return <Cargando />;
  return (
    <div className="tabla-contenedor">
      <table className="tabla tabla--densa">
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Referencia</th></tr></thead>
        <tbody>
          {lista.datos.map((a) => (
            <tr key={a.id}>
              <td>{new Date(String(a.creado_en).replace(' ', 'T') + (String(a.creado_en).includes('Z') || String(a.creado_en).includes('+') ? '' : 'Z')).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</td>
              <td>{a.usuario_email}</td>
              <td>{ACCIONES[a.accion] || a.accion.replace(/_/g, ' ')}</td>
              <td className="texto-suave">{a.entidad ? `${a.entidad} ${a.entidad_id || ''}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
