import { useState } from 'react';
import { api } from '../../api/index.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useAuth } from '../../context/Auth.jsx';
import { useAvisos } from '../../context/Avisos.jsx';
import { Boton, BotonIcono, Campo, Cargando, Confirmar, Encabezado, ErrorCarga, Panel, Vacio } from '../../components/ui.jsx';

export function Sedes() {
  const { esAdmin } = useAuth();
  const avisar = useAvisos();
  const sedes = useCarga(() => api.sedes.listar(), []);
  const [edicion, setEdicion] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [guardando, setGuardando] = useState(false);

  if (sedes.error) return <ErrorCarga error={sedes.error} reintentar={sedes.recargar} />;
  if (!sedes.datos) return <Cargando />;

  const guardar = async () => {
    setGuardando(true);
    try {
      const { id, colaboradores, ...d } = edicion;
      if (id) await api.sedes.actualizar(id, d); else await api.sedes.crear(d);
      avisar(id ? 'Sede actualizada.' : 'Sede creada.');
      setEdicion(null);
      sedes.recargar();
    } catch (e) { avisar(e.message, 'error'); } finally { setGuardando(false); }
  };

  return (
    <div className="pagina">
      <Encabezado titulo="Sedes" descripcion="Puntos de venta o lugares de trabajo.">
        {esAdmin && <Boton variante="primario" icono="mas" onClick={() => setEdicion({ nombre: '', direccion: '', ciudad: 'Bogotá' })}>Agregar sede</Boton>}
      </Encabezado>
      {sedes.datos.length === 0 ? <Vacio titulo="No hay sedes" texto="Crea la primera para agrupar a los colaboradores." /> : (
        <ul className="sedes">
          {sedes.datos.map((s) => (
            <li key={s.id} className="sede">
              <div>
                <h3>{s.nombre}</h3>
                <p>{[s.direccion, s.ciudad].filter(Boolean).join(', ') || 'Sin dirección'}</p>
              </div>
              <span className="sede__conteo"><strong>{s.colaboradores}</strong> {s.colaboradores === 1 ? 'persona' : 'personas'}</span>
              {esAdmin && (
                <div className="acciones">
                  <BotonIcono icono="editar" etiqueta={`Editar ${s.nombre}`} onClick={() => setEdicion(s)} />
                  <BotonIcono icono="borrar" etiqueta={`Eliminar ${s.nombre}`} onClick={() => setBorrar(s)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Panel abierto={Boolean(edicion)} titulo={edicion?.id ? 'Editar sede' : 'Nueva sede'} alCerrar={() => setEdicion(null)}
        pie={<><Boton onClick={() => setEdicion(null)}>Cancelar</Boton><Boton variante="primario" onClick={guardar} cargando={guardando}>Guardar sede</Boton></>}>
        {edicion && (
          <div className="form">
            <Campo etiqueta="Nombre">{(id) => <input id={id} value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} />}</Campo>
            <Campo etiqueta="Dirección">{(id) => <input id={id} value={edicion.direccion || ''} onChange={(e) => setEdicion({ ...edicion, direccion: e.target.value })} />}</Campo>
            <Campo etiqueta="Ciudad">{(id) => <input id={id} value={edicion.ciudad || ''} onChange={(e) => setEdicion({ ...edicion, ciudad: e.target.value })} />}</Campo>
          </div>
        )}
      </Panel>
      <Confirmar abierto={Boolean(borrar)} peligro titulo={`¿Eliminar ${borrar?.nombre}?`} texto="Los colaboradores de esta sede quedarán sin sede asignada." accion="Eliminar sede"
        alConfirmar={async () => { try { await api.sedes.eliminar(borrar.id); avisar('Sede eliminada.'); setBorrar(null); sedes.recargar(); } catch (e) { avisar(e.message, 'error'); } }} alCerrar={() => setBorrar(null)} />
    </div>
  );
}
