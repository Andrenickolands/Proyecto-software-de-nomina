import { cop, nombrePeriodo, num, pct, rangoPeriodo, FORMAS as FORMA, usaValorDia } from '../../lib/formato.js';

const linea = (x) => {
  if (x.unidad === 'horas') return `${num(x.cantidad)} h`;
  if (x.unidad === 'días') return `${x.cantidad} ${x.cantidad === 1 ? 'día' : 'días'}`;
  if (x.porcentaje) return pct(x.porcentaje);
  return x.detalle || '';
};

// Desprendible que se le entrega a cada persona
export function Desprendible({ fila, periodo, empresa }) {
  return (
    <article className="desprendible">
      <header className="desprendible__cabeza">
        <div>
          <strong>{empresa?.razon_social}</strong>
          <span>NIT {empresa?.nit}</span>
        </div>
        <div className="desprendible__periodo">
          <strong>Comprobante de pago</strong>
          <span>{nombrePeriodo(periodo)}, del {rangoPeriodo(periodo)}</span>
        </div>
      </header>
      <section className="desprendible__persona">
        <div><span>Colaborador</span><strong>{fila.nombre}</strong></div>
        <div><span>Documento</span><strong>{fila.documento}</strong></div>
        <div><span>Cargo</span><strong>{fila.cargo || '—'}</strong></div>
        <div><span>{usaValorDia(fila.tipo_vinculo) ? 'Valor día' : 'Salario básico'}</span><strong>{cop(usaValorDia(fila.tipo_vinculo) ? fila.valor_dia : fila.salario_base)}</strong></div>
      </section>
      <div className="desprendible__columnas">
        <section>
          <h3>Devengado</h3>
          <table>
            <tbody>
              {fila.devengos.map((d, i) => <tr key={i}><th scope="row">{d.concepto}<small>{linea(d)}</small></th><td>{cop(d.valor)}</td></tr>)}
            </tbody>
            <tfoot><tr><th scope="row">Total devengado</th><td>{cop(fila.total_devengado)}</td></tr></tfoot>
          </table>
        </section>
        <section>
          <h3>Deducciones</h3>
          {fila.deducciones.length ? (
            <table className="es-deduccion">
              <tbody>
                {fila.deducciones.map((d, i) => <tr key={i}><th scope="row">{d.concepto}<small>{linea(d)}</small></th><td>{cop(d.valor)}</td></tr>)}
              </tbody>
              <tfoot><tr><th scope="row">Total deducciones</th><td>{cop(fila.total_deducciones)}</td></tr></tfoot>
            </table>
          ) : <p className="texto-suave">Sin deducciones en esta quincena.</p>}
        </section>
      </div>
      <footer className="desprendible__talon">
        <div className="desprendible__neto">
          <span>{fila.a_pagar < 0 ? 'Saldo a descontar' : 'A pagar'}</span>
          <strong>{cop(Math.abs(fila.a_pagar ?? fila.neto))}</strong>
        </div>
        <dl>
          <div><dt>Pago</dt><dd>{FORMA[fila.forma_pago] || 'Quincenal'}</dd></div>
          {(fila.a_pagar ?? fila.neto) !== fila.neto && <div><dt>Neto de la quincena</dt><dd>{cop(fila.neto)}</dd></div>}
          {fila.ya_pagado > 0 && <div><dt>Ya pagado</dt><dd>{cop(fila.ya_pagado)}</dd></div>}
          <div><dt>Días pagados</dt><dd>{fila.dias.pagados}</dd></div>
          {fila.ibc > 0 && <div><dt>Base de aportes</dt><dd>{cop(fila.ibc)}</dd></div>}
        </dl>
        <div className="desprendible__firma">Recibí conforme</div>
        {fila.nota && <p className="desprendible__nota">{fila.nota}</p>}
      </footer>
    </article>
  );
}
