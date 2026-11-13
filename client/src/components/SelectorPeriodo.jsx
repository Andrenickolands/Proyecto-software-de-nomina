import { usePeriodo } from '../context/Periodo.jsx';
import { MESES, rangoPeriodo } from '../lib/formato.js';
import { Icono } from './Icono.jsx';

// Avanza o retrocede de quincena en quincena
const mover = ({ anio, mes, quincena }, paso) => {
  let i = (anio * 12 + (mes - 1)) * 2 + (quincena - 1) + paso;
  const q = (i % 2) + 1; i = Math.floor(i / 2);
  return { anio: Math.floor(i / 12), mes: (i % 12) + 1, quincena: q };
};

export function SelectorPeriodo() {
  const { actual, seleccionar } = usePeriodo();
  if (!actual) return <div className="selector-periodo selector-periodo--cargando" />;
  const ir = (paso) => { const p = mover(actual, paso); seleccionar(p.anio, p.mes, p.quincena); };
  return (
    <div className="selector-periodo">
      <span className="selector-periodo__titulo">Quincena activa</span>
      <div className="selector-periodo__fila">
        <button className="selector-periodo__flecha" onClick={() => ir(-1)} aria-label="Quincena anterior"><Icono nombre="izq" tam={16} /></button>
        <div className="selector-periodo__valor">
          <strong>{actual.quincena === 1 ? '1.ª' : '2.ª'} de {MESES[actual.mes - 1]}</strong>
          <span>{rangoPeriodo(actual)}, {actual.anio}</span>
        </div>
        <button className="selector-periodo__flecha" onClick={() => ir(1)} aria-label="Quincena siguiente"><Icono nombre="der" tam={16} /></button>
      </div>
      <span className={`selector-periodo__estado ${actual.estado === 'liquidado' ? 'es-cerrado' : ''}`}>
        <Icono nombre={actual.estado === 'liquidado' ? 'candado' : 'abrir'} tam={13} />
        {actual.estado === 'liquidado' ? 'Liquidada' : 'Abierta'}
      </span>
    </div>
  );
}
