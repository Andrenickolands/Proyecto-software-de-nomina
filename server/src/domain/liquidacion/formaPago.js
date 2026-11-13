// Cada cuánto se le paga a la persona. El cálculo legal sigue igual (por quincena),
// esto solo dice cuánto se le entrega al cierre.
// diaria: cada día trabajado se paga ese mismo día
// semanal: se paga cada domingo lo de esa semana; al cierre queda lo que no alcanzó a pagarse
// quincenal: se paga el neto de cada quincena
// mensual: en la Q1 no se paga, en la Q2 se paga el mes completo
import { addDays, inicioSemana } from '../fechas.js';

const domingoDe = (fecha) => addDays(inicioSemana(fecha), 6);
// lo que ya se le entregó por n días (proporcional para no descuadrar por redondeos)
const pagadoPor = (liq, n) => {
  const total = liq.pago_dias_total || 0;
  const dias = (liq.fechas_trabajadas || []).length;
  return dias ? Math.round((total * n) / dias) : 0;
};

export const FORMAS_PAGO = {
  diaria: {
    nombre: 'Diaria',
    calcular(liq) {
      const yaPagado = pagadoPor(liq, (liq.fechas_trabajadas || []).length);
      return { ya_pagado: yaPagado, a_pagar: liq.neto - yaPagado, nota: 'Los días trabajados ya se pagaron. Al cierre queda el saldo de descuentos y novedades.' };
    },
  },
  semanal: {
    nombre: 'Semanal',
    calcular(liq, { periodo }) {
      const pagadas = (liq.fechas_trabajadas || []).filter((f) => domingoDe(f) <= periodo.hasta);
      const yaPagado = pagadoPor(liq, pagadas.length);
      return { ya_pagado: yaPagado, a_pagar: liq.neto - yaPagado, nota: 'Las semanas completas ya se pagaron. Al cierre van los días sueltos y el saldo de novedades.' };
    },
  },
  quincenal: {
    nombre: 'Quincenal',
    calcular(liq) {
      return { ya_pagado: 0, a_pagar: liq.neto, nota: null };
    },
  },
  mensual: {
    nombre: 'Mensual',
    calcular(liq, { periodo, anterior }) {
      if (periodo.quincena === 1) return { ya_pagado: 0, a_pagar: 0, nota: 'Se paga junto con la segunda quincena.' };
      const pendiente = anterior ? anterior.neto : 0;
      return { ya_pagado: 0, a_pagar: liq.neto + pendiente, pendiente_q1: pendiente, nota: pendiente ? 'Incluye lo de la primera quincena.' : null };
    },
  },
};

// formasPermitidas sale de la estrategia del tipo de vinculación
export function aplicarFormaPago(colaborador, liq, ctx, formasPermitidas) {
  let clave = colaborador.forma_pago || formasPermitidas[0];
  const alertas = [...(liq.alertas || [])];
  if (!formasPermitidas.includes(clave)) {
    const elegida = formasPermitidas.includes('quincenal') ? 'quincenal' : formasPermitidas[formasPermitidas.length - 1];
    alertas.push(`La forma de pago "${FORMAS_PAGO[clave]?.nombre || clave}" no aplica para este tipo de contrato; se liquidó como ${FORMAS_PAGO[elegida].nombre.toLowerCase()}. Corrígela en Colaboradores.`);
    clave = elegida;
  }
  return { ...liq, forma_pago: clave, ...FORMAS_PAGO[clave].calcular(liq, ctx), alertas };
}

export const formasPago = () => Object.entries(FORMAS_PAGO).map(([clave, f]) => ({ clave, nombre: f.nombre }));
