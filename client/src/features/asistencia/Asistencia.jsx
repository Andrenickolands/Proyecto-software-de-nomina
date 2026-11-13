import { useMemo, useState } from 'react';
import { api } from '../../api/index.js';
import { useCarga } from '../../hooks/useCarga.js';
import { usePeriodo } from '../../context/Periodo.jsx';
import { useAuth } from '../../context/Auth.jsx';
import { useAvisos } from '../../context/Avisos.jsx';
import { Boton, Campo, Cargando, Confirmar, Encabezado, ErrorCarga, Panel, Vacio } from '../../components/ui.jsx';
import { DIAS, DIAS_CORTOS, diaSemana, fechaCorta, num, rangoPeriodo } from '../../lib/formato.js';

const ESTADOS = ['OK', 'Descanso', 'Falto', 'Permiso remunerado', 'Permiso no remunerado', 'Incapacidad', 'Vacaciones', 'Licencia de maternidad', 'Licencia de paternidad', 'No trabaja'];
const SIGLA = { Descanso: 'D', Falto: 'F', 'Permiso remunerado': 'P', 'Permiso no remunerado': 'PN', Incapacidad: 'I', Vacaciones: 'V', 'Licencia de maternidad': 'LM', 'Licencia de paternidad': 'LP', 'No trabaja': '–' };
const TONO = { OK: 'ok', Descanso: 'descanso', Falto: 'falta', 'Permiso no remunerado': 'falta', Incapacidad: 'incap', Vacaciones: 'vac', 'Permiso remunerado': 'vac', 'Licencia de maternidad': 'incap', 'Licencia de paternidad': 'incap', 'No trabaja': 'nada' };
const ETIQ_ESTADO = { OK: 'Trabajó' };
const DURACION = {
  'Licencia de maternidad': '18 semanas (126 días). La paga la empresa y la EPS se la devuelve.',
  'Licencia de paternidad': '2 semanas (14 días). La paga la empresa y la EPS se la devuelve.',
  Vacaciones: '15 días hábiles por año trabajado.',
};
const DURACION_DIAS = { 'Licencia de maternidad': 126, 'Licencia de paternidad': 14 };

function diasDe(p) {
  const out = [];
  for (let d = new Date(`${p.desde}T00:00:00Z`); d <= new Date(`${p.hasta}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}
const horasDia = (h) => (h ? (h.hod + h.hon + h.hed + h.hen + h.hdd + h.hdn) / 60 : 0);

export function Asistencia() {
  const { actual } = usePeriodo();
  const { esAdmin } = useAuth();
  const avisar = useAvisos();
  const datos = useCarga(() => (actual ? api.periodos.asistencia(actual.id) : Promise.resolve(null)), [actual?.id, actual?.estado]);
  const [celda, setCelda] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [rehacer, setRehacer] = useState(false);
  const [rangoForm, setRangoForm] = useState(null);
  const dias = useMemo(() => (actual ? diasDe(actual) : []), [actual]);

  if (datos.error) return <ErrorCarga error={datos.error} reintentar={datos.recargar} />;
  if (!actual || !datos.datos || datos.datos.periodo.id !== actual.id) return <Cargando filas={8} />;
  const { filas, festivos } = datos.datos;
  const festivosSet = new Set(festivos);
  const cerrada = actual.estado === 'liquidado';
  const editable = esAdmin && !cerrada;
  const sinRegistros = filas.every((f) => Object.keys(f.registros).length === 0);

  const generar = async (sobrescribir) => {
    try {
      const r = await api.periodos.generarAsistencia(actual.id, sobrescribir);
      avisar(r.creados ? `Se llenaron ${r.creados} días con los horarios.` : 'Todos los días ya tenían registro.');
      setRehacer(false);
      datos.recargar();
    } catch (e) { avisar(e.message, 'error'); }
  };

  const abrirCelda = (fila, fecha) => {
    if (!editable) return;
    const r = fila.registros[fecha] || { estado: 'OK', entrada: fila.colaborador.entrada, salida: fila.colaborador.salida, descanso_min: fila.colaborador.descanso_min };
    setCelda({ colaborador: fila.colaborador, fecha, estado: r.estado, entrada: r.entrada || '', salida: r.salida || '', descanso_min: r.descanso_min ?? 0, observacion: r.observacion || '' });
  };
  const guardarCelda = async () => {
    setGuardando(true);
    try {
      await api.periodos.guardarAsistencia(actual.id, [{ colaborador_id: celda.colaborador.id, fecha: celda.fecha, estado: celda.estado, entrada: celda.entrada, salida: celda.salida, descanso_min: Number(celda.descanso_min || 0), observacion: celda.observacion }]);
      setCelda(null);
      datos.recargar();
    } catch (e) { avisar(e.message, 'error'); } finally { setGuardando(false); }
  };

  return (
    <div className="pagina pagina--ancha">
      <Encabezado titulo="Asistencia" descripcion={`Del ${rangoPeriodo(actual)}. Toca un día para cambiar el estado o las horas.`}>
        {esAdmin && filas.length > 0 && <Boton onClick={() => setRangoForm({ colaborador_id: filas[0].colaborador.id, estado: 'Vacaciones', desde: actual.desde, hasta: actual.hasta, observacion: '' })}>Registrar por fechas</Boton>}
        {editable && !sinRegistros && <Boton onClick={() => setRehacer(true)}>Rehacer con horarios</Boton>}
        {editable && <Boton variante="primario" icono="chispa" onClick={() => generar(false)}>{sinRegistros ? 'Llenar con horarios' : 'Completar días vacíos'}</Boton>}
      </Encabezado>
      {cerrada && <p className="alerta alerta--info">Esta quincena está liquidada. Para corregir la asistencia, reábrela desde Nómina quincenal.</p>}

      {filas.length === 0 ? <Vacio titulo="No hay colaboradores vigentes en esta quincena" texto="Revisa las fechas de ingreso y retiro en Colaboradores." /> : (
        <>
          <div className="leyenda-estados" aria-label="Convenciones">
            {Object.entries(SIGLA).map(([e, s]) => <span key={e}><b className={`marca marca--${TONO[e]}`}>{s}</b>{e}</span>)}
            <span><b className="marca marca--ok marca--extra">8</b>Con horas extra</span>
          </div>
          <div className="tabla-contenedor tabla-contenedor--asistencia">
            <table className="tabla tabla--asistencia">
              <thead>
                <tr>
                  <th className="col-fija">Colaborador</th>
                  {dias.map((d) => {
                    const dom = diaSemana(d) === 0 || festivosSet.has(d);
                    return <th key={d} className={`col-dia ${dom ? 'es-dominical' : ''}`} title={festivosSet.has(d) ? 'Festivo' : DIAS[diaSemana(d)]}><span>{DIAS_CORTOS[diaSemana(d)]}</span>{Number(d.slice(8))}</th>;
                  })}
                  <th className="num">Ordinarias</th><th className="num">Extra</th><th className="num">Dom./fest.</th><th className="num">Nocturnas</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.colaborador.id}>
                    <th scope="row" className="col-fija">
                      <strong>{f.colaborador.nombre}</strong>
                      <span>{f.colaborador.sede || 'Sin sede'}</span>
                    </th>
                    {dias.map((d) => {
                      const r = f.registros[d];
                      const h = f.horas[d];
                      const extra = h && h.hed + h.hen > 0;
                      const dom = diaSemana(d) === 0 || festivosSet.has(d);
                      const texto = !r ? '' : r.estado === 'OK' ? num(Math.round(horasDia(h) * 10) / 10) : SIGLA[r.estado];
                      return (
                        <td key={d} className={`celda ${dom ? 'es-dominical' : ''}`}>
                          <button type="button" className={`marca marca--${r ? TONO[r.estado] : 'vacio'} ${extra ? 'marca--extra' : ''}`} disabled={!editable}
                            onClick={() => abrirCelda(f, d)} aria-label={`${f.colaborador.nombre}, ${fechaCorta(d)}: ${r ? (ETIQ_ESTADO[r.estado] || r.estado) : 'sin registro'}${r?.estado === 'OK' ? `, ${num(horasDia(h))} horas` : ''}`}>
                            {texto}
                          </button>
                        </td>
                      );
                    })}
                    <td className="num">{num(f.totales.hod + f.totales.hon)}</td>
                    <td className={`num ${f.totales.hed + f.totales.hen > 0 ? 'texto-ambar' : ''}`}>{num(f.totales.hed + f.totales.hen)}</td>
                    <td className="num">{num(f.totales.hdd + f.totales.hdn)}</td>
                    <td className="num">{num(f.totales.hon + f.totales.hen + f.totales.hdn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nota">Las horas de domingo y festivo se pagan aparte y no suman al tope semanal. Lo que pase de la jornada máxima de la semana (lunes a domingo) se liquida como hora extra. La franja nocturna empieza a las 7:00 p. m.</p>
        </>
      )}

      <Panel abierto={Boolean(celda)} titulo={celda?.colaborador.nombre} subtitulo={celda && `${DIAS[diaSemana(celda.fecha)]} ${fechaCorta(celda.fecha)}${festivosSet.has(celda.fecha) ? ', festivo' : ''}`} alCerrar={() => setCelda(null)}
        pie={<><Boton onClick={() => setCelda(null)}>Cancelar</Boton><Boton variante="primario" onClick={guardarCelda} cargando={guardando}>Guardar día</Boton></>}>
        {celda && (
          <div className="form">
            <Campo etiqueta="Estado">{(id) => (
              <select id={id} value={celda.estado} onChange={(e) => setCelda({ ...celda, estado: e.target.value })}>
                {ESTADOS.map((e) => <option key={e} value={e}>{ETIQ_ESTADO[e] || e}</option>)}
              </select>
            )}</Campo>
            {celda.estado === 'OK' && (
              <div className="form__fila">
                <Campo etiqueta="Entrada">{(id) => <input id={id} type="time" value={celda.entrada} onChange={(e) => setCelda({ ...celda, entrada: e.target.value })} />}</Campo>
                <Campo etiqueta="Salida">{(id) => <input id={id} type="time" value={celda.salida} onChange={(e) => setCelda({ ...celda, salida: e.target.value })} />}</Campo>
                <Campo etiqueta="Almuerzo (min)">{(id) => <input id={id} type="number" min="0" max="240" step="5" value={celda.descanso_min} onChange={(e) => setCelda({ ...celda, descanso_min: e.target.value })} />}</Campo>
              </div>
            )}
            <Campo etiqueta="Observación" ayuda="Opcional. Por ejemplo, número de incapacidad o motivo del permiso.">{(id) => <textarea id={id} rows="2" maxLength="200" value={celda.observacion} onChange={(e) => setCelda({ ...celda, observacion: e.target.value })} />}</Campo>
          </div>
        )}
      </Panel>
      <Panel abierto={Boolean(rangoForm)} titulo="Registrar por fechas" subtitulo="Para vacaciones, incapacidades o licencias que duran varios días o cruzan quincenas." alCerrar={() => setRangoForm(null)}
        pie={<><Boton onClick={() => setRangoForm(null)}>Cancelar</Boton><Boton variante="primario" onClick={async () => {
          try { const r = await api.asistenciaRango({ ...rangoForm, colaborador_id: Number(rangoForm.colaborador_id) }); avisar(`Se registraron ${r.guardados} días.`); setRangoForm(null); datos.recargar(); } catch (e) { avisar(e.message, 'error'); }
        }}>Registrar</Boton></>}>
        {rangoForm && (
          <div className="form">
            <Campo etiqueta="Colaborador">{(id) => (
              <select id={id} value={rangoForm.colaborador_id} onChange={(e) => setRangoForm({ ...rangoForm, colaborador_id: e.target.value })}>
                {filas.map((f) => <option key={f.colaborador.id} value={f.colaborador.id}>{f.colaborador.nombre}</option>)}
              </select>
            )}</Campo>
            <Campo etiqueta="Qué es" ayuda={DURACION[rangoForm.estado]}>{(id) => (
              <select id={id} value={rangoForm.estado} onChange={(e) => setRangoForm({ ...rangoForm, estado: e.target.value })}>
                {ESTADOS.filter((e) => e !== 'OK').map((e) => <option key={e}>{e}</option>)}
              </select>
            )}</Campo>
            <div className="form__fila">
              <Campo etiqueta="Desde">{(id) => <input id={id} type="date" value={rangoForm.desde} onChange={(e) => setRangoForm({ ...rangoForm, desde: e.target.value })} />}</Campo>
              <Campo etiqueta="Hasta">{(id) => <input id={id} type="date" value={rangoForm.hasta} onChange={(e) => setRangoForm({ ...rangoForm, hasta: e.target.value })} />}</Campo>
            </div>
            {DURACION_DIAS[rangoForm.estado] && <Boton onClick={() => {
              const d = new Date(`${rangoForm.desde}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + DURACION_DIAS[rangoForm.estado] - 1);
              setRangoForm({ ...rangoForm, hasta: d.toISOString().slice(0, 10) });
            }}>Calcular hasta ({DURACION_DIAS[rangoForm.estado]} días)</Boton>}
            <Campo etiqueta="Observación">{(id) => <input id={id} maxLength="200" value={rangoForm.observacion} onChange={(e) => setRangoForm({ ...rangoForm, observacion: e.target.value })} />}</Campo>
          </div>
        )}
      </Panel>
      <Confirmar abierto={rehacer} peligro titulo="¿Rehacer la asistencia con los horarios?" texto="Se reemplazan todos los días de esta quincena por el horario base de cada persona. Perderás las faltas, permisos y horas que hayas ajustado a mano." accion="Rehacer asistencia" alConfirmar={() => generar(true)} alCerrar={() => setRehacer(false)} />
    </div>
  );
}
