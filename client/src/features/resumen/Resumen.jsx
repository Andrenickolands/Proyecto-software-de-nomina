import { Link } from 'react-router-dom';
import { api } from '../../api/index.js';
import { useCarga } from '../../hooks/useCarga.js';
import { usePeriodo } from '../../context/Periodo.jsx';
import { Cargando, Encabezado, ErrorCarga, Etiqueta } from '../../components/ui.jsx';
import { cop, fechaCorta, MESES, nombrePeriodo, num, pct } from '../../lib/formato.js';

function Historial({ datos }) {
  if (!datos.length) return null;
  const max = Math.max(...datos.map((d) => d.neto), 1);
  const alto = 150;
  const ancho = 100 / datos.length;
  return (
    <figure className="historial">
      <figcaption>Neto pagado por quincena</figcaption>
      <svg viewBox={`0 0 100 ${alto + 26}`} preserveAspectRatio="none" role="img" aria-label="Neto pagado en las últimas quincenas">
        {[0.25, 0.5, 0.75, 1].map((t) => <line key={t} x1="0" x2="100" y1={alto - alto * t} y2={alto - alto * t} className="historial__guia" />)}
        {datos.map((d, i) => {
          const h = Math.max(2, (d.neto / max) * (alto - 8));
          return <rect key={d.periodo.id} x={i * ancho + ancho * 0.22} width={ancho * 0.56} y={alto - h} height={h} rx="0.8" className={d.periodo.estado === 'liquidado' ? 'historial__barra' : 'historial__barra historial__barra--abierta'}><title>{`${nombrePeriodo(d.periodo)}: ${cop(d.neto)}`}</title></rect>;
        })}
      </svg>
      <div className="historial__ejes">
        {datos.map((d) => <span key={d.periodo.id}>{d.periodo.quincena === 1 ? '1.ª' : '2.ª'} {MESES[d.periodo.mes - 1].slice(0, 3)}</span>)}
      </div>
      <div className="historial__leyenda"><span className="punto punto--lleno" /> Liquidada <span className="punto punto--hueco" /> En curso</div>
    </figure>
  );
}

export function Resumen() {
  const { actual } = usePeriodo();
  const resumen = useCarga(() => api.resumen(), [actual?.id, actual?.estado]);
  const nomina = useCarga(() => (actual ? api.periodos.nomina(actual.id) : Promise.resolve(null)), [actual?.id, actual?.estado]);

  if (resumen.error) return <ErrorCarga error={resumen.error} reintentar={resumen.recargar} />;
  if (!resumen.datos) return <Cargando filas={6} />;
  const r = resumen.datos;
  const n = nomina.datos;
  const p = r.parametros;
  const conAlertas = n?.filas.filter((f) => f.alertas?.length) || [];

  return (
    <div className="pagina">
      <Encabezado titulo={nombrePeriodo(actual)} descripcion={`${r.activos} colaboradores activos en ${r.sedes} sedes${r.jornales ? `, ${r.jornales} por jornal` : ''}.`} />

      <section className="hero-neto">
        <div className="hero-neto__cifra">
          <span>A pagar al cierre</span>
          <strong>{n ? cop(n.totales.a_pagar) : '—'}</strong>
          {actual && <Etiqueta tono={actual.estado === 'liquidado' ? 'acento' : 'ambar'}>{actual.estado === 'liquidado' ? 'Quincena liquidada' : 'Cálculo en vivo, aún sin liquidar'}</Etiqueta>}
        </div>
        <dl className="hero-neto__datos">
          <div><dt>Total devengado</dt><dd>{n ? cop(n.totales.devengado) : '—'}</dd></div>
          <div><dt>Deducciones</dt><dd className="texto-rojo">{n ? cop(n.totales.deducciones) : '—'}</dd></div>
          <div><dt>Neto de la quincena</dt><dd>{n ? cop(n.totales.neto) : '—'}</dd></div>
          <div><dt>Extras y recargos</dt><dd>{n ? cop(n.totales.extras) : '—'}</dd></div>
        </dl>
      </section>

      <div className="rejilla-resumen">
        <section className="bloque">
          <h2>Cómo cerrar la quincena</h2>
          <ol className="pasos">
            <li><Link to="/asistencia">Genera y ajusta la asistencia</Link><span>Se llena con el horario de cada persona; corrige faltas, permisos o incapacidades.</span></li>
            <li><Link to="/nomina">Agrega novedades</Link><span>Préstamos, vales, avances, bonificaciones o comisiones.</span></li>
            <li><Link to="/nomina">Liquida y entrega desprendibles</Link><span>Al liquidar, la quincena queda guardada y no cambia aunque edites datos.</span></li>
          </ol>
          {conAlertas.length > 0 && (
            <div className="alertas-lista">
              <h3>Para revisar</h3>
              <ul>{conAlertas.slice(0, 5).map((f) => <li key={f.colaborador_id}><strong>{f.nombre}</strong>: {f.alertas.join(' ')}</li>)}</ul>
            </div>
          )}
        </section>
        <section className="bloque">
          <Historial datos={r.historial} />
        </section>
        <section className="bloque">
          <h2>Normativa vigente hoy</h2>
          <dl className="lista-datos">
            <div><dt>Salario mínimo</dt><dd>{cop(p.smmlv)}</dd></div>
            <div><dt>Auxilio de transporte</dt><dd>{cop(p.auxilio_transporte)}</dd></div>
            <div><dt>Jornada máxima</dt><dd>{num(p.jornada_semanal)} h por semana</dd></div>
            <div><dt>Recargo dominical y festivo</dt><dd>{pct(p.recargo_dominical)}</dd></div>
            <div><dt>Jornada nocturna</dt><dd>{p.hora_inicio_nocturna} a {p.hora_fin_nocturna}</dd></div>
            <div><dt>UVT</dt><dd>{cop(p.uvt)}</dd></div>
          </dl>
          <Link className="enlace" to="/configuracion">Ver o cambiar parámetros</Link>
        </section>
        <section className="bloque">
          <h2>Próximos festivos</h2>
          {r.proximos_festivos.length ? (
            <ul className="festivos-lista">{r.proximos_festivos.map((f) => <li key={f.fecha}><strong>{fechaCorta(f.fecha)}</strong><span>{f.nombre}</span></li>)}</ul>
          ) : <p className="texto-suave">No hay festivos cargados para lo que queda del año.</p>}
        </section>
      </div>
    </div>
  );
}
