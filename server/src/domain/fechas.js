// Fechas como texto 'YYYY-MM-DD' en UTC para evitar problemas de zona horaria

export const toDate = (s) => new Date(`${s}T00:00:00Z`);
export const fmt = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
};
// 0 = domingo ... 6 = sábado
export const weekday = (s) => toDate(s).getUTCDay();
// lunes de la semana a la que pertenece la fecha
export const inicioSemana = (s) => {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
};
export const rango = (desde, hasta) => {
  const out = [];
  for (let d = desde; d <= hasta; d = addDays(d, 1)) out.push(d);
  return out;
};
export const ultimoDiaMes = (anio, mes) =>
  new Date(Date.UTC(anio, mes, 0)).getUTCDate();

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (a, m, d) => `${a}-${pad(m)}-${pad(d)}`;

// Q1 = del 1 al 15, Q2 = del 16 al último día
export const fechasQuincena = (anio, mes, q) =>
  q === 1
    ? { desde: ymd(anio, mes, 1), hasta: ymd(anio, mes, 15) }
    : { desde: ymd(anio, mes, 16), hasta: ymd(anio, mes, ultimoDiaMes(anio, mes)) };

// Días a pagar con mes de 30 días: el 31 no cuenta y febrero completa 30
export const diasComerciales = (desde, hasta) => {
  const [a, m, d1] = desde.split('-').map(Number);
  let d2 = Number(hasta.split('-')[2]);
  const fin = ultimoDiaMes(a, m);
  if (d2 === fin) d2 = 30;
  const ini = Math.min(d1, 30);
  return Math.max(0, Math.min(d2, 30) - ini + 1);
};

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Días entre dos fechas con año de 360 días (como se liquidan prestaciones), contando ambos extremos
export const dias360 = (desde, hasta) => {
  if (!desde || !hasta || hasta < desde) return 0;
  let [a1, m1, d1] = desde.split('-').map(Number);
  let [a2, m2, d2] = hasta.split('-').map(Number);
  if (d1 === 31) d1 = 30;
  if (d2 === 31) d2 = 30;
  // fin de febrero cuenta como día 30
  if (m2 === 2 && d2 === ultimoDiaMes(a2, 2)) d2 = 30;
  return (a2 - a1) * 360 + (m2 - m1) * 30 + (d2 - d1) + 1;
};
