import { useState } from 'react';
import { api } from '../../api/index.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useAuth } from '../../context/Auth.jsx';
import { useAvisos } from '../../context/Avisos.jsx';
import { Boton, Campo, Cargando, Confirmar, ErrorCarga, Etiqueta, Panel } from '../../components/ui.jsx';
import { cop, fechaCorta, hoyBogota, num, pct } from '../../lib/formato.js';

// Campos del formulario de parámetros; para agregar uno basta con otra línea aquí
const GRUPOS = [
  { titulo: 'Salario y auxilio', campos: [
    ['smmlv', 'Salario mínimo mensual', 'pesos'], ['auxilio_transporte', 'Auxilio de transporte', 'pesos'],
    ['tope_aux_transporte_smmlv', 'Auxilio hasta (salarios mínimos)', 'numero'], ['uvt', 'Valor UVT', 'pesos'],
  ] },
  { titulo: 'Jornada y recargos', campos: [
    ['jornada_semanal', 'Jornada máxima semanal (horas)', 'numero'], ['factor_horas_mes', 'Factor horas al mes', 'numero', 'Horas del mes = jornada × factor. Con 42 h y factor 5 da 210 h.'],
    ['hora_inicio_nocturna', 'Inicio jornada nocturna', 'hora'], ['hora_fin_nocturna', 'Fin jornada nocturna', 'hora'],
    ['recargo_nocturno', 'Recargo nocturno', 'pct'], ['recargo_extra_diurna', 'Hora extra diurna', 'pct'],
    ['recargo_extra_nocturna', 'Hora extra nocturna', 'pct'], ['recargo_dominical', 'Recargo dominical y festivo', 'pct'],
    ['dominical_incluye_base', 'La hora dominical se paga completa (100 % + recargo)', 'bool'],
  ] },
  { titulo: 'Aportes del trabajador', campos: [['salud_empleado', 'Salud', 'pct'], ['pension_empleado', 'Pensión', 'pct'], ['incapacidad_porcentaje', 'Pago de incapacidad', 'pct']] },
  { titulo: 'Aportes del empleador', campos: [
    ['salud_empleador', 'Salud', 'pct'], ['pension_empleador', 'Pensión', 'pct'], ['caja_compensacion', 'Caja de compensación', 'pct'],
    ['icbf', 'ICBF', 'pct'], ['sena', 'SENA', 'pct'], ['exonerado_114_1', 'Exonerada de salud, SENA e ICBF (art. 114-1 E.T.)', 'bool'],
  ] },
  { titulo: 'Prestaciones sociales', campos: [['prima', 'Prima de servicios', 'pct'], ['cesantias', 'Cesantías', 'pct'], ['intereses_cesantias_anual', 'Intereses de cesantías (anual)', 'pct'], ['vacaciones', 'Vacaciones', 'pct']] },
  { titulo: 'Retención en la fuente', campos: [['retencion_activa', 'Calcular retención (procedimiento 1)', 'bool'], ['renta_exenta_porcentaje', 'Renta exenta', 'pct'], ['renta_exenta_tope_uvt_anual', 'Tope renta exenta (UVT al año)', 'numero']] },
];

function CampoParametro({ def: [k, etiqueta, tipo, ayuda], valores, set }) {
  const v = valores[k];
  if (tipo === 'bool') return <label className="casilla casilla--fila"><input type="checkbox" checked={Boolean(v)} onChange={(e) => set(k, e.target.checked)} /> {etiqueta}</label>;
  const mostrar = tipo === 'pct' ? Math.round(Number(v) * 100000) / 1000 : v;
  return (
    <Campo etiqueta={tipo === 'pct' ? `${etiqueta} (%)` : etiqueta} ayuda={ayuda}>
      {(id) => <input id={id} type={tipo === 'hora' ? 'time' : 'number'} step={tipo === 'pct' ? '0.001' : tipo === 'pesos' ? '1' : '0.5'} value={mostrar ?? ''}
        onChange={(e) => set(k, tipo === 'hora' ? e.target.value : tipo === 'pct' ? Number(e.target.value) / 100 : Number(e.target.value))} />}
    </Campo>
  );
}

export function Parametros() {
  const { esAdmin } = useAuth();
  const avisar = useAvisos();
  const lista = useCarga(() => api.parametros.listar(), []);
  const [edicion, setEdicion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [borrar, setBorrar] = useState(null);

  if (lista.error) return <ErrorCarga error={lista.error} reintentar={lista.recargar} />;
  if (!lista.datos) return <Cargando />;
  const hoy = hoyBogota();
  const vigente = [...lista.datos].reverse().find((v) => v.vigente_desde <= hoy);

  const set = (k, v) => setEdicion((e) => ({ ...e, valores: { ...e.valores, [k]: v } }));
  const setArl = (n, v) => setEdicion((e) => ({ ...e, valores: { ...e.valores, arl: { ...e.valores.arl, [n]: v } } }));
  const nueva = (base) => setEdicion({ id: null, vigente_desde: '', nombre: '', valores: structuredClone(base.valores) });
  const guardar = async () => {
    setGuardando(true);
    try {
      const { id, vigente_desde, nombre, valores } = edicion;
      if (id) await api.parametros.actualizar(id, { vigente_desde, nombre, valores }); else await api.parametros.crear({ vigente_desde, nombre, valores });
      avisar(id ? 'Parámetros actualizados.' : 'Nueva versión creada.');
      setEdicion(null);
      lista.recargar();
    } catch (e) { avisar(e.message, 'error'); } finally { setGuardando(false); }
  };

  return (
    <section>
      <div className="bloque__cabeza">
        <p className="texto-suave texto-ancho">Cada versión rige desde su fecha. El cálculo usa, día por día, la versión vigente: así una quincena que cruza el 1 de julio paga el domingo 30 de junio al 80 % y el 5 de julio al 90 %.</p>
        {esAdmin && vigente && <Boton variante="primario" icono="mas" onClick={() => nueva(vigente)}>Nueva versión</Boton>}
      </div>
      <ol className="linea-tiempo">
        {lista.datos.map((v) => (
          <li key={v.id} className={v.id === vigente?.id ? 'es-vigente' : v.vigente_desde > hoy ? 'es-futura' : ''}>
            <div className="linea-tiempo__fecha">{fechaCorta(v.vigente_desde)}</div>
            <div className="linea-tiempo__cuerpo">
              <div className="linea-tiempo__titulo">
                <strong>{v.nombre}</strong>
                {v.id === vigente?.id && <Etiqueta tono="acento">Vigente hoy</Etiqueta>}
                {v.vigente_desde > hoy && <Etiqueta tono="azul">Programada</Etiqueta>}
              </div>
              <p>Mínimo {cop(v.valores.smmlv)}, auxilio {cop(v.valores.auxilio_transporte)}, jornada {num(v.valores.jornada_semanal)} h, dominical {pct(v.valores.recargo_dominical)}, nocturna desde {v.valores.hora_inicio_nocturna}.</p>
              {esAdmin && (
                <div className="linea-tiempo__acciones">
                  <Boton onClick={() => setEdicion(structuredClone(v))}>Editar</Boton>
                  <Boton onClick={() => nueva(v)}>Duplicar</Boton>
                  {lista.datos.length > 1 && <Boton variante="fantasma" onClick={() => setBorrar(v)}>Eliminar</Boton>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      <Panel abierto={Boolean(edicion)} ancho="ancho" titulo={edicion?.id ? 'Editar parámetros' : 'Nueva versión de parámetros'} subtitulo="Los cambios aplican a las quincenas que aún no estén liquidadas." alCerrar={() => setEdicion(null)}
        pie={<><Boton onClick={() => setEdicion(null)}>Cancelar</Boton><Boton variante="primario" onClick={guardar} cargando={guardando}>{edicion?.id ? 'Guardar cambios' : 'Crear versión'}</Boton></>}>
        {edicion && (
          <div className="form">
            <div className="form__fila">
              <Campo etiqueta="Rige desde">{(id) => <input id={id} type="date" value={edicion.vigente_desde} onChange={(e) => setEdicion({ ...edicion, vigente_desde: e.target.value })} />}</Campo>
              <Campo etiqueta="Nombre" ancho="2" ayuda="Por ejemplo, el decreto que fija el valor.">{(id) => <input id={id} value={edicion.nombre || ''} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} />}</Campo>
            </div>
            {GRUPOS.map((g) => (
              <fieldset key={g.titulo}>
                <legend>{g.titulo}</legend>
                <div className="form__rejilla">{g.campos.map((c) => <CampoParametro key={c[0]} def={c} valores={edicion.valores} set={set} />)}</div>
              </fieldset>
            ))}
            <fieldset>
              <legend>ARL por nivel de riesgo</legend>
              <div className="form__rejilla form__rejilla--5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Campo key={n} etiqueta={`Riesgo ${n} (%)`}>{(id) => <input id={id} type="number" step="0.001" value={Math.round(edicion.valores.arl[n] * 100000) / 1000} onChange={(e) => setArl(n, Number(e.target.value) / 100)} />}</Campo>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </Panel>
      <Confirmar abierto={Boolean(borrar)} peligro titulo="¿Eliminar esta versión?" texto={`Las fechas desde ${borrar && fechaCorta(borrar.vigente_desde)} pasarán a usar la versión anterior.`} accion="Eliminar versión"
        alConfirmar={async () => { try { await api.parametros.eliminar(borrar.id); avisar('Versión eliminada.'); setBorrar(null); lista.recargar(); } catch (e) { avisar(e.message, 'error'); } }} alCerrar={() => setBorrar(null)} />
    </section>
  );
}
