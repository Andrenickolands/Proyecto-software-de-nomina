import { useState } from 'react';
import { api } from '../../api/index.js';
import { useCarga } from '../../hooks/useCarga.js';
import { cop, fechaCorta, hoyBogota } from '../../lib/formato.js';

// Cuánto hay que pagar en un día o una semana a quienes cobran a diario o semanal
export function PagosDiarios({ periodo }) {
  const hoy = hoyBogota();
  const inicial = hoy >= periodo.desde && hoy <= periodo.hasta ? hoy : periodo.desde;
  const [fecha, setFecha] = useState(inicial);
  const [modo, setModo] = useState('semana');
  const datos = useCarga(() => api.pagos(fecha, modo), [fecha, modo]);
  const sinNadie = datos.datos && datos.datos.filas.length === 0;

  return (
    <section className="bloque">
      <div className="bloque__cabeza">
        <h2>Pagos por día y por semana</h2>
        <div className="filtros filtros--sin-margen">
          <div className="segmentado" role="radiogroup" aria-label="Ver pagos">
            {[['dia', 'Del día'], ['semana', 'De la semana']].map(([k, t]) => (
              <label key={k} className={modo === k ? 'activo' : ''}><input type="radio" name="modo-pago" checked={modo === k} onChange={() => setModo(k)} />{t}</label>
            ))}
          </div>
          <input type="date" aria-label="Fecha" className="input-fecha" min={periodo.desde} max={periodo.hasta} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>
      {datos.datos && (
        <>
          {modo === 'semana' && <p className="texto-suave">Del {fechaCorta(datos.datos.desde)} al {fechaCorta(datos.datos.hasta)}. Incluye jornal y auxilio de transporte del día.</p>}
          {sinNadie ? (
            <p className="texto-suave">Nadie tiene pago {modo === 'dia' ? 'diario' : 'semanal'}. Se configura en Colaboradores, campo Forma de pago.</p>
          ) : (
            <ul className="novedades">
              {datos.datos.filas.map((f) => (
                <li key={f.colaborador_id}>
                  <div><strong>{f.nombre}</strong><span>{f.dias} {f.dias === 1 ? 'día trabajado' : 'días trabajados'}{f.sede ? `, ${f.sede}` : ''}</span></div>
                  <strong className="num">{cop(f.valor)}</strong>
                </li>
              ))}
              <li className="novedades__total"><div><strong>Total</strong></div><strong className="num">{cop(datos.datos.total)}</strong></li>
            </ul>
          )}
        </>
      )}
    </section>
  );
}
