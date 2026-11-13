// Jornal: trabajador con contrato laboral al que se le paga por día trabajado.
// Tiene los mismos derechos que cualquier empleado: auxilio de transporte, recargos,
// seguridad social y prestaciones, en proporción a lo que trabaja.
import { clasificarHoras, ESTADOS } from '../horas.js';
import { esDevengo, esDeduccion, aConcepto } from './novedades.js';
import { aportesEmpleador, cotizacionPorDias, provisionPrestaciones, sumar, redondear } from './aportes.js';
import { ventanaLaboral, conteoDias, totalizar, alertasExtras } from './resumen.js';
import { valorarHoras } from './estrategiaSalario.js';

// lo que se le paga por cada día trabajado: el jornal y, si aplica, el auxilio del día
export function pagoPorDia(colaborador, p) {
  const valorDia = Number(colaborador.valor_dia || 0);
  if (colaborador.tipo_vinculo !== 'jornal') return valorDia;
  const conAuxilio = valorDia * 30 <= p.tope_aux_transporte_smmlv * p.smmlv;
  return valorDia + (conAuxilio ? p.auxilio_transporte / 30 : 0);
}

export const estrategiaJornal = Object.freeze({
  tipo: 'jornal',
  nombre: 'Jornal (contrato por días)',
  // art. 134 CST: el jornal no se puede pagar por periodos de más de una semana
  formasPago: ['diaria', 'semanal'],

  liquidar(colaborador, { periodo, registros, festivos, getParams, novedades = [], anterior = null }) {
    const p = getParams(periodo.hasta);
    const ventana = ventanaLaboral(colaborador, periodo);
    const { trabajados, dominicales } = conteoDias(registros, ventana, festivos);
    const fechas = registros.filter((r) => r.estado === ESTADOS.OK && r.fecha >= ventana.desde && r.fecha <= ventana.hasta).map((r) => r.fecha);
    const horas = clasificarHoras({ registros, festivos, getParams, ...ventana });
    const valorDia = Number(colaborador.valor_dia || 0);

    const jornales = redondear(trabajados * valorDia);
    const devengos = [{ concepto: 'Jornales', cantidad: trabajados, unidad: 'días', valor: jornales }];
    const enLicencia = registros.filter((r) => [ESTADOS.LICENCIA_MATERNIDAD, ESTADOS.LICENCIA_PATERNIDAD].includes(r.estado) && r.fecha >= ventana.desde && r.fecha <= ventana.hasta).length;
    const licencias = redondear(enLicencia * valorDia);
    if (licencias) devengos.push({ concepto: 'Licencia', detalle: 'la reconoce la EPS', cantidad: enLicencia, unidad: 'días', valor: licencias });
    let auxilio = 0;
    if (valorDia * 30 <= p.tope_aux_transporte_smmlv * p.smmlv && trabajados > 0) {
      auxilio = redondear((p.auxilio_transporte * trabajados) / 30);
      devengos.push({ concepto: 'Auxilio de transporte', cantidad: trabajados, unidad: 'días', valor: auxilio });
    }
    // extras y recargos, con la hora sacada del jornal (valor del día / horas diarias)
    const conceptosHoras = valorarHoras(horas.dias, valorDia, getParams, true);
    devengos.push(...conceptosHoras);
    const extras = totalizar(conceptosHoras);
    const novDev = novedades.filter(esDevengo).map(aConcepto);
    devengos.push(...novDev);
    const devSalariales = totalizar(novDev.filter((n) => n.salarial));
    const ingresoSalarial = jornales + licencias + extras + devSalariales;

    // salud y pensión se descuentan con el mes completo (Q2), porque la forma de
    // cotizar depende de cuántos días trabajó en el mes (Decreto 2616 de 2013)
    const deducciones = [];
    let cotizacion = null;
    let aportesEmpleado = 0;
    if (periodo.quincena === 2) {
      cotizacion = cotizacionPorDias({
        diasMes: trabajados + enLicencia + (anterior?.dias?.trabajados || 0) + (anterior?.dias?.licencias || 0),
        ingresoMes: ingresoSalarial + (anterior?.ingreso_salarial || 0),
      }, p);
      const salud = cotizacion.salud ? redondear(cotizacion.ibc * p.salud_empleado) : 0;
      const pension = redondear(cotizacion.ibc * p.pension_empleado);
      if (salud) deducciones.push({ concepto: 'Salud', porcentaje: p.salud_empleado, valor: salud });
      if (pension) deducciones.push({ concepto: cotizacion.porSemanas ? `Pensión (${cotizacion.semanas} sem.)` : 'Pensión', porcentaje: p.pension_empleado, valor: pension });
      aportesEmpleado = salud + pension;
    }
    deducciones.push(...novedades.filter(esDeduccion).map(aConcepto));

    const totalDevengado = totalizar(devengos);
    const totalDeducciones = totalizar(deducciones);
    const alertas = [...alertasExtras(horas.excesos, p)];
    if (valorDia * 30 < p.smmlv && trabajados > 0) {
      const minimoDia = Math.round(p.smmlv / 30);
      if (valorDia < minimoDia) alertas.push(`El valor del día está por debajo del mínimo diario (${minimoDia.toLocaleString('es-CO')}).`);
    }
    if (periodo.quincena === 1) alertas.push('Salud y pensión se descuentan en la segunda quincena, con los días del mes.');
    if (cotizacion?.porSemanas) alertas.push(`Cotiza por ${cotizacion.semanas} semana(s): salud por el régimen subsidiado (Decreto 2616 de 2013).`);

    return {
      tipo_vinculo: this.tipo, salario_base: 0, valor_dia: valorDia,
      dias: { trabajados, pagados: trabajados + enLicencia, licencias: enLicencia, dominicales },
      fechas_trabajadas: fechas,
      pago_por_dia: Math.round(pagoPorDia(colaborador, p)),
      pago_dias_total: jornales + auxilio,
      horas: horas.totales, devengos, deducciones,
      sueldo: jornales, auxilio, extras, devengos_salariales: devSalariales,
      ingreso_salarial: ingresoSalarial,
      ibc: cotizacion ? cotizacion.ibc : 0,
      cotizacion,
      aportes_empleado: aportesEmpleado,
      base_prestaciones: jornales + licencias + extras + devSalariales + auxilio,
      total_devengado: totalDevengado, total_deducciones: totalDeducciones, neto: totalDevengado - totalDeducciones,
      alertas,
    };
  },

  consolidar(colaborador, liquidaciones, p) {
    const suma = (k) => liquidaciones.reduce((s, l) => s + (Number(l[k]) || 0), 0);
    const cot = cotizacionPorDias({ diasMes: liquidaciones.reduce((s, l) => s + (l.dias?.trabajados || 0) + (l.dias?.licencias || 0), 0), ingresoMes: suma('ingreso_salarial') }, p);
    const nivel = Number(colaborador.nivel_arl || 1);
    const { exonerado, aportes } = aportesEmpleador({ ibc: cot.ibc, ibcArl: cot.ibcArl, salario: Number(colaborador.valor_dia || 0) * 30, nivelArl: nivel, porSemanas: cot.porSemanas }, p);
    const prestaciones = provisionPrestaciones({ basePrestaciones: suma('base_prestaciones'), sueldo: suma('sueldo') }, p);
    const devengado = suma('total_devengado');
    return {
      tipo_vinculo: this.tipo, salario_base: 0, nivel_arl: nivel, exonerado,
      ibc: cot.ibc, cotizacion: cot, devengado, neto: suma('neto'), base_prestaciones: suma('base_prestaciones'),
      aportes, total_aportes: sumar(aportes), prestaciones, total_prestaciones: sumar(prestaciones),
      costo_total: devengado + sumar(aportes) + sumar(prestaciones),
    };
  },
});
