// Funciones que usan tanto salario como jornal
import { ESTADOS } from '../horas.js';
import { weekday } from '../fechas.js';

export function ventanaLaboral(colaborador, periodo) {
  const desde = colaborador.fecha_ingreso && colaborador.fecha_ingreso > periodo.desde ? colaborador.fecha_ingreso : periodo.desde;
  const hasta = colaborador.fecha_retiro && colaborador.fecha_retiro < periodo.hasta ? colaborador.fecha_retiro : periodo.hasta;
  return { desde, hasta };
}

export function conteoDias(registros, { desde, hasta }, festivos) {
  const enPeriodo = registros.filter((r) => r.fecha >= desde && r.fecha <= hasta);
  // los días 31 no cuentan en el mes comercial de 30 días
  const cuenta = (estado) => enPeriodo.filter((r) => r.estado === estado && Number(r.fecha.slice(8)) <= 30).length;
  const trabajados = enPeriodo.filter((r) => r.estado === ESTADOS.OK);
  return {
    cuenta,
    trabajados: trabajados.length,
    dominicales: trabajados.filter((r) => weekday(r.fecha) === 0 || festivos.has(r.fecha)).length,
  };
}

export const totalizar = (lista) => lista.reduce((s, x) => s + x.valor, 0);

// Avisos cuando se pasa el tope de horas extra (2 al día, 12 a la semana)
export function alertasExtras(excesos, p) {
  const a = [];
  if (excesos?.dias?.length) a.push(`Más de ${p.extras_max_dia} h extra en el día: ${excesos.dias.map((f) => Number(f.slice(8))).join(', ')}. La ley no lo permite.`);
  if (excesos?.semanas?.length) a.push(`Más de ${p.extras_max_semana} h extra en la semana que empieza el ${excesos.semanas.map((f) => Number(f.slice(8))).join(', ')}.`);
  return a;
}
