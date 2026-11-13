// Festivos de Colombia con la Ley Emiliani (los que se corren al lunes)
import { addDays, weekday, ymd } from './fechas.js';

// Domingo de Pascua, de aquí salen Semana Santa, Ascensión, Corpus y Sagrado Corazón
function pascua(anio) {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(anio, mes, dia);
}

// si no cae lunes, pasa al lunes siguiente
const aLunes = (s) => {
  const wd = weekday(s);
  return wd === 1 ? s : addDays(s, (8 - wd) % 7);
};

export function festivosColombia(anio) {
  const p = pascua(anio);
  const lista = [
    [ymd(anio, 1, 1), 'Año Nuevo'],
    [aLunes(ymd(anio, 1, 6)), 'Día de los Reyes Magos'],
    [aLunes(ymd(anio, 3, 19)), 'Día de San José'],
    [addDays(p, -3), 'Jueves Santo'],
    [addDays(p, -2), 'Viernes Santo'],
    [ymd(anio, 5, 1), 'Día del Trabajo'],
    [aLunes(addDays(p, 39)), 'Ascensión del Señor'],
    [aLunes(addDays(p, 60)), 'Corpus Christi'],
    [aLunes(addDays(p, 68)), 'Sagrado Corazón'],
    [aLunes(ymd(anio, 6, 29)), 'San Pedro y San Pablo'],
    [ymd(anio, 7, 20), 'Día de la Independencia'],
    [ymd(anio, 8, 7), 'Batalla de Boyacá'],
    [aLunes(ymd(anio, 8, 15)), 'La Asunción de la Virgen'],
    [aLunes(ymd(anio, 10, 12)), 'Día de la Raza'],
    [aLunes(ymd(anio, 11, 1)), 'Todos los Santos'],
    [aLunes(ymd(anio, 11, 11)), 'Independencia de Cartagena'],
    [ymd(anio, 12, 8), 'Inmaculada Concepción'],
    [ymd(anio, 12, 25), 'Navidad'],
  ];
  // a veces dos festivos caen el mismo lunes (30 de junio de 2025), se dejan en uno solo
  const porFecha = new Map();
  for (const [fecha, nombre] of lista) {
    porFecha.set(fecha, porFecha.has(fecha) ? `${porFecha.get(fecha)} y ${nombre}` : nombre);
  }
  return [...porFecha]
    .map(([fecha, nombre]) => ({ fecha, nombre }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
