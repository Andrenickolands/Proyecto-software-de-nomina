import { useMemo, useState } from 'react';
import { api } from '../../api/index.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useAuth } from '../../context/Auth.jsx';
import { useAvisos } from '../../context/Avisos.jsx';
import { Boton, BotonIcono, Cargando, Confirmar, Encabezado, ErrorCarga, Etiqueta, Panel, Vacio } from '../../components/ui.jsx';
import { cop, DIAS, iniciales, FORMAS, TIPOS, usaValorDia, fechaCorta } from '../../lib/formato.js';
import { FormColaborador, COLAB_VACIO } from './FormColaborador.jsx';
import { PanelTerminacion, HojaLiquidacion, MOTIVOS } from './Terminacion.jsx';

const erroresDe = (e) => Object.fromEntries((e?.datos?.detalles || []).map((d) => [d.campo, d.mensaje]));

export function Colaboradores() {
  const { esAdmin } = useAuth();
  const avisar = useAvisos();
  const lista = useCarga(() => Promise.all([api.colaboradores.listar(), api.sedes.listar(), api.parametros.vigente(), api.terminaciones.listar()]), []);
  const [retirar, setRetirar] = useState(null);
  const [verLiq, setVerLiq] = useState(null);
  const [filtro, setFiltro] = useState({ texto: '', sede: '', estado: 'activos' });
  const [edicion, setEdicion] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [borrar, setBorrar] = useState(null);

  const [colabs = [], sedes = [], vig, terminaciones = []] = lista.datos || [];
  const visibles = useMemo(() => colabs.filter((c) =>
    (!filtro.texto || `${c.nombre} ${c.documento} ${c.cargo}`.toLowerCase().includes(filtro.texto.toLowerCase())) &&
    (!filtro.sede || String(c.sede_id) === filtro.sede) &&
    (filtro.estado === 'todos' || (filtro.estado === 'activos' ? c.activo : !c.activo))), [colabs, filtro]);

  if (lista.error) return <ErrorCarga error={lista.error} reintentar={lista.recargar} />;
  if (!lista.datos) return <Cargando filas={8} />;

  const abrir = (c) => { setErrores({}); setEdicion(c ? { ...COLAB_VACIO, ...c, sede_id: c.sede_id ?? '', dia_descanso: c.dia_descanso ?? '' } : { ...COLAB_VACIO }); };
  const guardar = async () => {
    setGuardando(true);
    setErrores({});
    const { id, sede, created_at, updated_at, ...datos } = edicion;
    try {
      if (id) await api.colaboradores.actualizar(id, datos); else await api.colaboradores.crear(datos);
      avisar(id ? 'Colaborador actualizado.' : 'Colaborador creado.');
      setEdicion(null);
      lista.recargar();
    } catch (e) {
      setErrores(erroresDe(e));
      avisar(e.message, 'error');
    } finally {
      setGuardando(false);
    }
  };
  const eliminar = async () => {
    try {
      await api.colaboradores.eliminar(borrar.id);
      avisar('Colaborador eliminado.');
      setBorrar(null);
      lista.recargar();
    } catch (e) { avisar(e.message, 'error'); }
  };

  return (
    <div className="pagina">
      <Encabezado titulo="Colaboradores" descripcion="Datos de contrato, salario y horario base de cada persona.">
        {esAdmin && <Boton variante="primario" icono="mas" onClick={() => abrir(null)}>Agregar colaborador</Boton>}
      </Encabezado>

      <div className="filtros">
        <input type="search" placeholder="Buscar por nombre, documento o cargo" aria-label="Buscar colaborador" value={filtro.texto} onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })} />
        <select aria-label="Filtrar por sede" value={filtro.sede} onChange={(e) => setFiltro({ ...filtro, sede: e.target.value })}>
          <option value="">Todas las sedes</option>
          {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select aria-label="Filtrar por estado" value={filtro.estado} onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      {visibles.length === 0 ? (
        <Vacio titulo={colabs.length ? 'Nadie coincide con la búsqueda' : 'Todavía no hay colaboradores'} texto={colabs.length ? 'Prueba con otro nombre o quita los filtros.' : 'Agrega a la primera persona para empezar a registrar asistencia.'}>
          {!colabs.length && esAdmin && <Boton variante="primario" icono="mas" onClick={() => abrir(null)}>Agregar colaborador</Boton>}
        </Vacio>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead><tr><th>Colaborador</th><th>Sede</th><th>Vinculación</th><th>Pago</th><th className="num">Salario o día</th><th>Horario</th><th>Descanso</th><th aria-label="Acciones" /></tr></thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.id} className={c.activo ? '' : 'fila--apagada'}>
                  <td>
                    <div className="persona">
                      <span className="avatar avatar--claro" aria-hidden="true">{iniciales(c.nombre)}</span>
                      <div><strong>{c.nombre}</strong><span>{c.cargo || 'Sin cargo'}, CC {c.documento}</span></div>
                    </div>
                  </td>
                  <td>{c.sede || '—'}</td>
                  <td><Etiqueta tono={c.tipo_vinculo === 'servicios' ? 'azul' : c.tipo_vinculo === 'jornal' ? 'ambar' : 'neutro'}>{TIPOS[c.tipo_vinculo]}</Etiqueta> {c.estudia ? <Etiqueta tono="azul">Estudia</Etiqueta> : null}</td>
                  <td>{FORMAS[c.forma_pago] || 'Quincenal'}</td>
                  <td className="num">{usaValorDia(c.tipo_vinculo) ? `${cop(c.valor_dia)} / día` : cop(c.salario_base)}</td>
                  <td>{c.entrada} – {c.salida}</td>
                  <td>{c.dia_descanso === null || c.dia_descanso === undefined ? 'Sin fijo' : DIAS[c.dia_descanso]}</td>
                  <td className="acciones">
                    {esAdmin && <BotonIcono icono="editar" etiqueta={`Editar a ${c.nombre}`} onClick={() => abrir(c)} />}
                    {esAdmin && c.activo && c.tipo_vinculo !== 'servicios' ? <BotonIcono icono="salir" etiqueta={`Liquidar contrato de ${c.nombre}`} onClick={() => setRetirar(c)} /> : null}
                    {esAdmin && <BotonIcono icono="borrar" etiqueta={`Eliminar a ${c.nombre}`} onClick={() => setBorrar(c)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {terminaciones.length > 0 && (
        <section className="bloque">
          <h2>Contratos liquidados</h2>
          <ul className="novedades">
            {terminaciones.map((t) => (
              <li key={t.id}>
                <div><strong>{t.detalle.nombre}</strong><span>{MOTIVOS[t.motivo]}, retiro el {fechaCorta(t.fecha_retiro)}</span></div>
                <strong className="num">{cop(t.total)}</strong>
                <Boton onClick={() => setVerLiq(t.detalle)}>Ver</Boton>
              </li>
            ))}
          </ul>
        </section>
      )}

      {retirar && <PanelTerminacion colaborador={retirar} alCerrar={() => setRetirar(null)} alGuardar={() => { setRetirar(null); lista.recargar(); }} />}
      <Panel abierto={Boolean(verLiq)} ancho="ancho" titulo="Liquidación de contrato" subtitulo={verLiq?.nombre} alCerrar={() => setVerLiq(null)}
        pie={<><Boton onClick={() => setVerLiq(null)}>Cerrar</Boton><Boton variante="primario" icono="imprimir" onClick={() => window.print()}>Imprimir</Boton></>}>
        {verLiq && <div className="imprimible"><HojaLiquidacion liq={verLiq} /></div>}
      </Panel>

      <Panel abierto={Boolean(edicion)} ancho="ancho" titulo={edicion?.id ? 'Editar colaborador' : 'Nuevo colaborador'} alCerrar={() => setEdicion(null)}
        pie={<><Boton onClick={() => setEdicion(null)}>Cancelar</Boton><Boton variante="primario" onClick={guardar} cargando={guardando}>{edicion?.id ? 'Guardar cambios' : 'Crear colaborador'}</Boton></>}>
        {edicion && <FormColaborador valor={edicion} onChange={setEdicion} sedes={sedes} errores={errores} smmlv={vig?.valores?.smmlv} />}
      </Panel>
      <Confirmar abierto={Boolean(borrar)} peligro titulo={`¿Eliminar a ${borrar?.nombre}?`} texto="Se borran también su asistencia y novedades. Las quincenas ya liquidadas conservan su registro. Si solo dejó de trabajar, mejor márcalo como inactivo." accion="Eliminar" alConfirmar={eliminar} alCerrar={() => setBorrar(null)} />
    </div>
  );
}
