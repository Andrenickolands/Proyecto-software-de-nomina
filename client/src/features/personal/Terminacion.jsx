import { useState } from 'react';
import { api } from '../../api/index.js';
import { useAvisos } from '../../context/Avisos.jsx';
import { Boton, Campo, Panel } from '../../components/ui.jsx';
import { cop, fechaCorta, hoyBogota, num } from '../../lib/formato.js';

export const MOTIVOS = {
  renuncia: 'Renuncia del trabajador',
  justa_causa: 'Despido con justa causa',
  sin_justa_causa: 'Despido sin justa causa',
  mutuo_acuerdo: 'Mutuo acuerdo',
  fin_contrato: 'Se acabó el plazo o la obra',
};

// Hoja de liquidación del contrato (la que firma la persona al salir)
export function HojaLiquidacion({ liq }) {
  return (
    <article className="desprendible">
      <header className="desprendible__cabeza">
        <div><strong>Liquidación de contrato</strong><span>{liq.nombre}, CC {liq.documento}</span></div>
        <div className="desprendible__periodo"><strong>{MOTIVOS[liq.motivo]}</strong><span>Del {fechaCorta(liq.fecha_ingreso)} al {fechaCorta(liq.fecha_retiro)}</span></div>
      </header>
      <section className="desprendible__persona">
        <div><span>Salario base</span><strong>{cop(liq.salario)}</strong></div>
        <div><span>Promedio variable</span><strong>{cop(liq.promedio_variable)}</strong></div>
        <div><span>Auxilio de transporte</span><strong>{liq.con_auxilio ? 'Sí' : 'No'}</strong></div>
        <div><span>Días trabajados</span><strong>{num(liq.dias_trabajados)}</strong></div>
      </section>
      <div className="desprendible__columnas desprendible__columnas--una">
        <section>
          <table>
            <tbody>
              {liq.conceptos.map((c) => (
                <tr key={c.concepto}>
                  <th scope="row">{c.concepto}<small>{num(c.dias)} días sobre {cop(c.base)}{c.detalle ? `. ${c.detalle}` : ''}</small></th>
                  <td>{cop(c.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <footer className="desprendible__talon">
        <div className="desprendible__neto"><span>Total a pagar</span><strong>{cop(liq.total)}</strong></div>
        <div />
        <div className="desprendible__firma">Recibí conforme</div>
      </footer>
    </article>
  );
}

export function PanelTerminacion({ colaborador, alCerrar, alGuardar }) {
  const avisar = useAvisos();
  const [form, setForm] = useState({ fecha_retiro: hoyBogota(), motivo: 'renuncia', dias_vacaciones_tomadas: colaborador?.dias_vacaciones_tomadas ?? 0, promedio_variable: '' });
  const [liq, setLiq] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const datos = () => ({ ...form, promedio_variable: form.promedio_variable === '' ? undefined : Number(form.promedio_variable), dias_vacaciones_tomadas: Number(form.dias_vacaciones_tomadas) });
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setLiq(null); };

  const calcular = async () => {
    setTrabajando(true);
    try {
      const r = await api.colaboradores.calcularTerminacion(colaborador.id, datos());
      setLiq(r);
      if (form.promedio_variable === '') setForm((f) => ({ ...f, promedio_variable: r.promedio_variable }));
    } catch (e) { avisar(e.message, 'error'); } finally { setTrabajando(false); }
  };
  const guardar = async () => {
    setTrabajando(true);
    try {
      await api.colaboradores.guardarTerminacion(colaborador.id, datos());
      avisar(`Contrato de ${colaborador.nombre} liquidado.`);
      alGuardar();
    } catch (e) { avisar(e.message, 'error'); } finally { setTrabajando(false); }
  };

  return (
    <Panel abierto={Boolean(colaborador)} ancho="ancho" titulo="Liquidar contrato" subtitulo={colaborador?.nombre} alCerrar={alCerrar}
      pie={<>
        <Boton onClick={alCerrar}>Cancelar</Boton>
        {liq && <Boton icono="imprimir" onClick={() => window.print()}>Imprimir</Boton>}
        {liq ? <Boton variante="peligro" onClick={guardar} cargando={trabajando}>Guardar y retirar</Boton> : <Boton variante="primario" onClick={calcular} cargando={trabajando}>Calcular</Boton>}
      </>}>
      <div className="form">
        <div className="form__fila">
          <Campo etiqueta="Último día de trabajo">{(id) => <input id={id} type="date" value={form.fecha_retiro} onChange={set('fecha_retiro')} />}</Campo>
          <Campo etiqueta="Motivo" ancho="2">{(id) => (
            <select id={id} value={form.motivo} onChange={set('motivo')}>
              {Object.entries(MOTIVOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          )}</Campo>
        </div>
        <div className="form__fila">
          <Campo etiqueta="Días de vacaciones ya tomados">{(id) => <input id={id} type="number" min="0" step="0.5" value={form.dias_vacaciones_tomadas} onChange={set('dias_vacaciones_tomadas')} />}</Campo>
          <Campo etiqueta="Promedio variable al mes" ayuda="Extras, recargos y comisiones. Si lo dejas vacío se saca de las quincenas liquidadas del último año.">{(id) => <input id={id} type="number" min="0" step="1000" value={form.promedio_variable} onChange={set('promedio_variable')} />}</Campo>
        </div>
        <p className="texto-suave">El salario de los últimos días se paga en la quincena normal. Al guardar, la persona queda retirada con esa fecha.</p>
        {liq && (
          <>
            {liq.alertas.length > 0 && <ul className="alerta alerta--ambar">{liq.alertas.map((a) => <li key={a}>{a}</li>)}</ul>}
            <div className="imprimible"><HojaLiquidacion liq={liq} /></div>
          </>
        )}
      </div>
    </Panel>
  );
}
