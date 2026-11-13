import { useEffect, useState } from 'react';
import { api } from '../../api/index.js';
import { useCarga } from '../../hooks/useCarga.js';
import { usePeriodo } from '../../context/Periodo.jsx';
import { Boton, Cargando, Encabezado, ErrorCarga, Etiqueta, Vacio } from '../../components/ui.jsx';
import { cop, descargarCsv, MESES, TIPOS } from '../../lib/formato.js';

const COLS = [
  ['salud', 'Salud'], ['pension', 'Pensión'], ['arl', 'ARL'], ['caja', 'Caja'], ['icbf', 'ICBF'], ['sena', 'SENA'],
  ['prima', 'Prima'], ['cesantias', 'Cesantías'], ['intereses_cesantias', 'Int. cesantías'], ['vacaciones', 'Vacaciones'],
];
const valor = (f, k) => f.aportes?.[k] ?? f.prestaciones?.[k] ?? 0;

export function Consolidado() {
  const { actual } = usePeriodo();
  const [mes, setMes] = useState(null);
  useEffect(() => { if (actual && !mes) setMes({ anio: actual.anio, mes: actual.mes }); }, [actual, mes]);
  const datos = useCarga(() => (mes ? api.consolidado(mes.anio, mes.mes) : Promise.resolve(null)), [mes?.anio, mes?.mes]);

  if (datos.error) return <ErrorCarga error={datos.error} reintentar={datos.recargar} />;
  if (!mes || !datos.datos) return <Cargando filas={8} />;
  const { filas, periodos, parametros } = datos.datos;
  const total = (fn) => filas.reduce((s, f) => s + fn(f), 0);
  const exportar = () => descargarCsv(`consolidado-${mes.anio}-${String(mes.mes).padStart(2, '0')}.csv`, [
    ['Colaborador', 'Devengado', 'IBC', ...COLS.map(([, t]) => t), 'Total aportes', 'Total prestaciones', 'Costo total'],
    ...filas.map((f) => [f.nombre, f.devengado, f.ibc, ...COLS.map(([k]) => valor(f, k)), f.total_aportes, f.total_prestaciones, f.costo_total]),
  ]);
  const anios = [mes.anio - 1, mes.anio, mes.anio + 1];

  return (
    <div className="pagina pagina--ancha">
      <Encabezado titulo="Consolidado del mes" descripcion="Aportes del empleador a la planilla PILA y provisión de prestaciones sociales.">
        <select aria-label="Mes" value={mes.mes} onChange={(e) => setMes({ ...mes, mes: Number(e.target.value) })}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m[0].toUpperCase() + m.slice(1)}</option>)}</select>
        <select aria-label="Año" value={mes.anio} onChange={(e) => setMes({ ...mes, anio: Number(e.target.value) })}>{anios.map((a) => <option key={a}>{a}</option>)}</select>
        <Boton icono="descargar" onClick={exportar} disabled={!filas.length}>Exportar CSV</Boton>
      </Encabezado>
      <div className="chips">
        {[1, 2].map((q) => {
          const p = periodos.find((x) => x.quincena === q);
          return <Etiqueta key={q} tono={p?.estado === 'liquidado' ? 'acento' : p ? 'ambar' : 'neutro'}>{q === 1 ? 'Primera' : 'Segunda'} quincena: {p?.estado === 'liquidado' ? 'liquidada' : p ? 'en vivo' : 'sin abrir'}</Etiqueta>;
        })}
        {parametros.exonerado_114_1 && <Etiqueta tono="azul">Exonerada de salud, SENA e ICBF (art. 114-1 E.T.)</Etiqueta>}
      </div>
      {filas.length === 0 ? <Vacio titulo="Sin quincenas en este mes" texto="Abre una quincena de este mes desde el selector de la barra lateral." /> : (
        <div className="tabla-contenedor">
          <table className="tabla tabla--densa">
            <thead>
              <tr><th rowSpan="2">Colaborador</th><th rowSpan="2" className="num">Devengado</th><th rowSpan="2" className="num">IBC</th><th className="grupo" colSpan="6">Aportes del empleador</th><th className="grupo" colSpan="4">Provisión de prestaciones</th><th rowSpan="2" className="num">Costo total</th></tr>
              <tr>{COLS.map(([k, t]) => <th key={k} className="num">{t}</th>)}</tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.colaborador_id}>
                  <td className="col-nombre"><strong>{f.nombre}</strong>{f.tipo_vinculo !== 'salario' && <span className="texto-suave"> ({TIPOS[f.tipo_vinculo].toLowerCase()}{f.cotizacion?.porSemanas ? `, ${f.cotizacion.semanas} sem.` : ''})</span>}</td>
                  <td className="num">{cop(f.devengado)}</td>
                  <td className="num">{cop(f.ibc)}</td>
                  {COLS.map(([k]) => <td key={k} className="num">{cop(valor(f, k))}</td>)}
                  <td className="num"><strong>{cop(f.costo_total)}</strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="num">{cop(total((f) => f.devengado))}</td>
                <td className="num">{cop(total((f) => f.ibc))}</td>
                {COLS.map(([k]) => <td key={k} className="num">{cop(total((f) => valor(f, k)))}</td>)}
                <td className="num"><strong>{cop(total((f) => f.costo_total))}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="nota">Los trabajadores por días que ganan menos de un mínimo en el mes cotizan por semanas (Decreto 2616 de 2013): pensión, ARL y caja; la salud va por el régimen subsidiado. Los contratistas de prestación de servicios no generan aportes ni prestaciones. Recuerda la dotación (calzado y vestido) tres veces al año para quienes ganan hasta dos mínimos.</p>
      <p className="nota">La prima y las cesantías se provisionan sobre salario, extras, recargos, devengos salariales y auxilio de transporte. Las vacaciones, solo sobre el salario. Los intereses de cesantías se provisionan al 1 % mensual (12 % anual).</p>
    </div>
  );
}
