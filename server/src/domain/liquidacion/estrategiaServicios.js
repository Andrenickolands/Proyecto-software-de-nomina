// Prestación de servicios: no es empleado. Se le paga lo acordado por día
// y él mismo paga su seguridad social, así que aquí no hay aportes ni prestaciones.
import { ESTADOS } from '../horas.js';
import { esDevengo, esDeduccion, aConcepto } from './novedades.js';
import { ventanaLaboral, conteoDias, totalizar } from './resumen.js';

export const estrategiaServicios = Object.freeze({
  tipo: 'servicios',
  nombre: 'Prestación de servicios',
  formasPago: ['diaria', 'semanal', 'quincenal', 'mensual'],

  liquidar(colaborador, { periodo, registros, festivos, novedades = [] }) {
    const ventana = ventanaLaboral(colaborador, periodo);
    const { trabajados } = conteoDias(registros, ventana, festivos);
    const fechas = registros.filter((r) => r.estado === ESTADOS.OK && r.fecha >= ventana.desde && r.fecha <= ventana.hasta).map((r) => r.fecha);
    const valorDia = Number(colaborador.valor_dia || 0);
    const devengos = [
      { concepto: 'Honorarios', cantidad: trabajados, unidad: 'días', valor: Math.round(trabajados * valorDia) },
      ...novedades.filter(esDevengo).map(aConcepto),
    ];
    const deducciones = novedades.filter(esDeduccion).map(aConcepto);
    const totalDevengado = totalizar(devengos);
    const totalDeducciones = totalizar(deducciones);
    return {
      tipo_vinculo: this.tipo, salario_base: 0, valor_dia: valorDia,
      dias: { trabajados, pagados: trabajados, dominicales: 0 },
      fechas_trabajadas: fechas, pago_por_dia: valorDia, pago_dias_total: Math.round(trabajados * valorDia),
      horas: {}, devengos, deducciones,
      sueldo: 0, auxilio: 0, extras: 0, ibc: 0, aportes_empleado: 0, base_prestaciones: 0,
      total_devengado: totalDevengado, total_deducciones: totalDeducciones, neto: totalDevengado - totalDeducciones,
      alertas: ['Contratista: debe pagar su propia seguridad social. Si cumple horario y recibe órdenes, puede ser una relación laboral.'],
    };
  },

  consolidar(colaborador, liquidaciones) {
    const devengado = liquidaciones.reduce((s, l) => s + (Number(l.total_devengado) || 0), 0);
    return {
      tipo_vinculo: this.tipo, salario_base: 0, ibc: 0, devengado,
      neto: liquidaciones.reduce((s, l) => s + (Number(l.neto) || 0), 0),
      aportes: {}, total_aportes: 0, prestaciones: {}, total_prestaciones: 0, costo_total: devengado,
    };
  },
});
