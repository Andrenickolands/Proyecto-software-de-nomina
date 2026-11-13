import { useState } from 'react';
import { api } from '../../api/index.js';
import { useAvisos } from '../../context/Avisos.jsx';
import { Boton, BotonIcono, Campo, Panel } from '../../components/ui.jsx';
import { cop } from '../../lib/formato.js';

export function Novedades({ periodo, novedades, colaboradores, tipos, editable, alCambiar }) {
  const avisar = useAvisos();
  const [nueva, setNueva] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.periodos.agregarNovedad(periodo.id, { ...nueva, colaborador_id: Number(nueva.colaborador_id), valor: Number(nueva.valor) });
      avisar('Novedad agregada.');
      setNueva(null);
      alCambiar();
    } catch (e) { avisar(e.message, 'error'); } finally { setGuardando(false); }
  };
  const quitar = async (n) => {
    try { await api.periodos.eliminarNovedad(n.id); avisar('Novedad eliminada.'); alCambiar(); } catch (e) { avisar(e.message, 'error'); }
  };

  return (
    <section className="bloque">
      <div className="bloque__cabeza">
        <h2>Novedades de la quincena</h2>
        {editable && <Boton icono="mas" onClick={() => setNueva({ colaborador_id: colaboradores[0]?.colaborador_id || '', tipo: 'vale', valor: '', descripcion: '' })}>Agregar novedad</Boton>}
      </div>
      {novedades.length === 0 ? (
        <p className="texto-suave">Sin préstamos, vales, bonificaciones ni comisiones en esta quincena.</p>
      ) : (
        <ul className="novedades">
          {novedades.map((n) => {
            const t = tipos[n.tipo];
            return (
              <li key={n.id}>
                <span className={`novedades__signo ${t?.clase === 'deduccion' ? 'es-menos' : 'es-mas'}`} aria-hidden="true">{t?.clase === 'deduccion' ? '−' : '+'}</span>
                <div><strong>{n.nombre}</strong><span>{t?.nombre}{n.descripcion ? `: ${n.descripcion}` : ''}</span></div>
                <strong className="num">{cop(n.valor)}</strong>
                {editable && <BotonIcono icono="borrar" etiqueta="Eliminar novedad" onClick={() => quitar(n)} />}
              </li>
            );
          })}
        </ul>
      )}
      <Panel abierto={Boolean(nueva)} titulo="Nueva novedad" alCerrar={() => setNueva(null)}
        pie={<><Boton onClick={() => setNueva(null)}>Cancelar</Boton><Boton variante="primario" onClick={guardar} cargando={guardando}>Agregar novedad</Boton></>}>
        {nueva && (
          <div className="form">
            <Campo etiqueta="Colaborador">{(id) => (
              <select id={id} value={nueva.colaborador_id} onChange={(e) => setNueva({ ...nueva, colaborador_id: e.target.value })}>
                {colaboradores.map((c) => <option key={c.colaborador_id} value={c.colaborador_id}>{c.nombre}</option>)}
              </select>
            )}</Campo>
            <Campo etiqueta="Tipo" ayuda={tipos[nueva.tipo]?.clase === 'deduccion' ? 'Se descuenta del neto.' : tipos[nueva.tipo]?.salarial ? 'Suma al salario y a la base de aportes.' : 'Suma al neto, no a la base de aportes.'}>{(id) => (
              <select id={id} value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })}>
                <optgroup label="Deducciones">{Object.entries(tipos).filter(([, t]) => t.clase === 'deduccion').map(([k, t]) => <option key={k} value={k}>{t.nombre}</option>)}</optgroup>
                <optgroup label="Devengos">{Object.entries(tipos).filter(([, t]) => t.clase === 'devengo').map(([k, t]) => <option key={k} value={k}>{t.nombre}</option>)}</optgroup>
              </select>
            )}</Campo>
            <Campo etiqueta="Valor">{(id) => <input id={id} type="number" min="1" step="1000" value={nueva.valor} onChange={(e) => setNueva({ ...nueva, valor: e.target.value })} />}</Campo>
            <Campo etiqueta="Descripción">{(id) => <input id={id} maxLength="160" value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} />}</Campo>
          </div>
        )}
      </Panel>
    </section>
  );
}
