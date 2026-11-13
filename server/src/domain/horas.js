// Separa las horas trabajadas en ordinarias, extra, nocturnas y dominicales.
// - Domingos y festivos van aparte y no suman para el tope de la semana.
// - Lo que pase de la jornada semanal (44 o 42 h) en días normales es extra.
// - Nocturno es de 7 p. m. a 6 a. m. (sale de los parámetros).
// - El almuerzo se quita en la mitad del turno.
// - Si el turno pasa de medianoche cuenta para el día en que empezó.

import { inicioSemana, weekday } from './fechas.js';

export const ESTADOS = {
  OK: 'OK',
  DESCANSO: 'Descanso',
  FALTO: 'Falto',
  PERMISO_REMUNERADO: 'Permiso remunerado',
  PERMISO_NO_REMUNERADO: 'Permiso no remunerado',
  INCAPACIDAD: 'Incapacidad',
  VACACIONES: 'Vacaciones',
  LICENCIA_MATERNIDAD: 'Licencia de maternidad',
  LICENCIA_PATERNIDAD: 'Licencia de paternidad',
  NO_TRABAJA: 'No trabaja',
};
export const LISTA_ESTADOS = Object.values(ESTADOS);

export const aMinutos = (hhmm) => {
  if (!hhmm) return null;
  const m = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

// un true/false por cada minuto trabajado: true si es nocturno
export function minutosTurno(entrada, salida, descansoMin, params) {
  const ini = aMinutos(entrada);
  let fin = aMinutos(salida);
  if (ini == null || fin == null) return [];
  if (fin <= ini) fin += 24 * 60;
  const nIni = aMinutos(params.hora_inicio_nocturna);
  const nFin = aMinutos(params.hora_fin_nocturna);
  const total = fin - ini;
  const pausa = Math.min(Math.max(0, Number(descansoMin) || 0), total);
  const inicioPausa = Math.floor((total - pausa) / 2);
  const out = [];
  for (let i = 0; i < total; i++) {
    if (i >= inicioPausa && i < inicioPausa + pausa) continue;
    const m = (ini + i) % (24 * 60);
    out.push(m >= nIni || m < nFin);
  }
  return out;
}

const vacio = () => ({ hod: 0, hon: 0, hed: 0, hen: 0, hdd: 0, hdn: 0 });

// ojo: los registros deben incluir los días de la semana anterior al periodo,
// si no, las extras de la primera semana salen mal
export function clasificarHoras({ registros, festivos, getParams, desde, hasta }) {
  const ordenados = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const acumuladoSemana = new Map();
  const dias = [];

  for (const r of ordenados) {
    const p = getParams(r.fecha);
    const detalle = { fecha: r.fecha, estado: r.estado, ...vacio(), dominical: false, minutos: 0 };
    if (r.estado === ESTADOS.OK && r.entrada && r.salida) {
      const mins = minutosTurno(r.entrada, r.salida, r.descanso_min, p);
      detalle.minutos = mins.length;
      const esDominical = weekday(r.fecha) === 0 || festivos.has(r.fecha);
      detalle.dominical = esDominical;
      if (esDominical) {
        for (const noct of mins) noct ? detalle.hdn++ : detalle.hdd++;
      } else {
        const semana = inicioSemana(r.fecha);
        let acum = acumuladoSemana.get(semana) || 0;
        const tope = p.jornada_semanal * 60;
        for (const noct of mins) {
          if (acum < tope) noct ? detalle.hon++ : detalle.hod++;
          else noct ? detalle.hen++ : detalle.hed++;
          acum++;
        }
        acumuladoSemana.set(semana, acum);
      }
    }
    dias.push(detalle);
  }

  const totales = vacio();
  const extraSemana = new Map();
  const excesos = { dias: [], semanas: [] };
  for (const d of dias) {
    const extra = d.hed + d.hen;
    const semana = inicioSemana(d.fecha);
    extraSemana.set(semana, (extraSemana.get(semana) || 0) + extra);
    if (d.fecha < desde || d.fecha > hasta) continue;
    if (extra > getParams(d.fecha).extras_max_dia * 60) excesos.dias.push(d.fecha);
    for (const k of Object.keys(totales)) totales[k] += d[k];
  }
  for (const [semana, min] of extraSemana) {
    const domingo = new Date(`${semana}T00:00:00Z`); domingo.setUTCDate(domingo.getUTCDate() + 6);
    const fin = domingo.toISOString().slice(0, 10);
    if (fin >= desde && semana <= hasta && min > getParams(semana).extras_max_semana * 60) excesos.semanas.push(semana);
  }
  for (const k of Object.keys(totales)) totales[k] = Math.round((totales[k] / 60) * 100) / 100;
  return { dias: dias.filter((d) => d.fecha >= desde && d.fecha <= hasta), totales, excesos };
}
