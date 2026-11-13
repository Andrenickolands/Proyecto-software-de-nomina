const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_CORTOS = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'];

export const FORMAS = { diaria: 'Diaria', semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual' };
export const TIPOS = { salario: 'Salario', integral: 'Salario integral', jornal: 'Jornal', servicios: 'Prestación de servicios' };
// art. 134 CST: el jornal se paga máximo cada semana y el sueldo máximo cada mes
export const FORMAS_POR_TIPO = {
  salario: ['quincenal', 'mensual'],
  integral: ['quincenal', 'mensual'],
  jornal: ['diaria', 'semanal'],
  servicios: ['diaria', 'semanal', 'quincenal', 'mensual'],
};
export const usaValorDia = (tipo) => tipo === 'jornal' || tipo === 'servicios';

export const cop = (n) => pesos.format(Math.round(Number(n) || 0));
export const num = (n) => numero.format(Number(n) || 0);
export const pct = (n) => `${numero.format((Number(n) || 0) * 100)} %`;

export const fechaCorta = (s) => {
  const [a, m, d] = s.split('-').map(Number);
  return `${d} de ${MESES[m - 1]}${a !== new Date().getFullYear() ? ` de ${a}` : ''}`;
};
export const diaSemana = (s) => new Date(`${s}T00:00:00Z`).getUTCDay();
export const nombrePeriodo = (p) => (p ? `${p.quincena === 1 ? 'Primera' : 'Segunda'} quincena de ${MESES[p.mes - 1]} ${p.anio}` : '');
export const rangoPeriodo = (p) => (p ? `${Number(p.desde.slice(8))} al ${Number(p.hasta.slice(8))} de ${MESES[p.mes - 1]}` : '');
export const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
export const iniciales = (nombre = '') => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export function descargarCsv(nombre, filas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const contenido = '﻿' + filas.map((f) => f.map(esc).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  a.click();
  URL.revokeObjectURL(url);
}
