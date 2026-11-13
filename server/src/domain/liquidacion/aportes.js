// Seguridad social, retención y prestaciones
import { TABLA_RETENCION } from '../parametros.js';

export const redondear = (n) => Math.round(n);

// FSP: 1 % desde 4 salarios mínimos, sube hasta 2 %
export function tasaFsp(ibcMensual, p) {
  const enSmmlv = ibcMensual / p.smmlv;
  return (p.fsp || []).reduce((tasa, t) => (enSmmlv >= t.desde ? t.tasa : tasa), 0);
}

// Retención procedimiento 1 (tabla del art. 383 E.T.)
// Deducciones del art. 387: dependientes (10 % hasta 32 UVT), intereses de vivienda (hasta 100 UVT)
// y medicina prepagada (hasta 16 UVT). Después la renta exenta del 25 % (hasta 790 UVT al año).
// Entre deducciones y exenta no se puede restar más del 40 % de lo que queda después de aportes.
export function retencionMensual({ ingresos, aportes, dependientes = false, vivienda = 0, medicina = 0 }, p) {
  if (!p.retencion_activa) return { base: 0, valor: 0, baseUvt: 0, deducciones: 0, exenta: 0 };
  const subtotal = Math.max(0, ingresos - aportes);
  const deducciones =
    (dependientes ? Math.min(ingresos * p.dependientes_porcentaje, p.dependientes_tope_uvt * p.uvt) : 0) +
    Math.min(Number(vivienda) || 0, p.vivienda_tope_uvt * p.uvt) +
    Math.min(Number(medicina) || 0, p.medicina_tope_uvt * p.uvt);
  const topeExenta = (p.renta_exenta_tope_uvt_anual / 12) * p.uvt;
  const exenta = Math.min(Math.max(0, subtotal - deducciones) * p.renta_exenta_porcentaje, topeExenta);
  const beneficios = Math.min(deducciones + exenta, subtotal * p.limite_beneficios_retencion);
  const base = Math.max(0, subtotal - beneficios);
  const baseUvt = base / p.uvt;
  const fila = TABLA_RETENCION.find((f) => baseUvt > f.desde && baseUvt <= f.hasta) || TABLA_RETENCION[0];
  const uvtRet = fila.tasa === 0 ? 0 : (baseUvt - fila.desde) * fila.tasa + fila.base;
  // se redondea a miles
  const valor = Math.round((uvtRet * p.uvt) / 1000) * 1000;
  return { base: redondear(base), valor, baseUvt: Math.round(baseUvt * 100) / 100, deducciones: redondear(deducciones), exenta: redondear(exenta) };
}

// Lo que pone la empresa en la PILA.
// porSemanas: trabajador por días que cotiza por semanas (Decreto 2616 de 2013),
// solo paga pensión, ARL y caja; la salud va por el régimen subsidiado.
export function aportesEmpleador({ ibc, salario, nivelArl, porSemanas = false, ibcArl = ibc }, p) {
  const exonerado = p.exonerado_114_1 && salario < 10 * p.smmlv;
  const tasaArl = p.arl[nivelArl] ?? p.arl[1];
  return {
    exonerado,
    aportes: {
      salud: exonerado || porSemanas ? 0 : redondear(ibc * p.salud_empleador),
      pension: redondear(ibc * p.pension_empleador),
      arl: redondear(ibcArl * tasaArl),
      caja: redondear(ibc * p.caja_compensacion),
      icbf: exonerado || porSemanas ? 0 : redondear(ibc * p.icbf),
      sena: exonerado || porSemanas ? 0 : redondear(ibc * p.sena),
    },
  };
}

// Cotización de quien trabaja por días (Decreto 2616 de 2013).
// Si en el mes gana menos de un mínimo y trabaja menos de 30 días, cotiza por semanas:
// 1 a 7 días = 1 semana, 8 a 14 = 2, 15 a 21 = 3, más de 21 = el mes completo.
// Cada semana vale 1/4 del mínimo. La ARL siempre se paga sobre un mínimo.
export function cotizacionPorDias({ diasMes, ingresoMes }, p) {
  if (diasMes >= 30 || ingresoMes >= p.smmlv) {
    const ibc = Math.min(Math.max(ingresoMes, 0), p.tope_ibc_smmlv * p.smmlv);
    return { porSemanas: false, semanas: null, ibc: redondear(ibc), ibcArl: redondear(ibc), salud: true };
  }
  const semanas = diasMes === 0 ? 0 : diasMes <= 7 ? 1 : diasMes <= 14 ? 2 : diasMes <= 21 ? 3 : 4;
  const ibc = Math.max(ingresoMes, (semanas * p.smmlv) / 4);
  return { porSemanas: true, semanas, ibc: redondear(ibc), ibcArl: semanas ? p.smmlv : 0, salud: false };
}

// Lo que se va guardando cada mes para prima, cesantías y vacaciones
export function provisionPrestaciones({ basePrestaciones, sueldo }, p) {
  const cesantias = redondear(basePrestaciones * p.cesantias);
  return {
    prima: redondear(basePrestaciones * p.prima),
    cesantias,
    intereses_cesantias: redondear((cesantias * p.intereses_cesantias_anual) / 12),
    vacaciones: redondear(sueldo * p.vacaciones),
  };
}

export const sumar = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
