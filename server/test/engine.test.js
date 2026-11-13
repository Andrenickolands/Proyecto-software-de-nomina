import { test } from 'node:test';
import assert from 'node:assert/strict';
import { festivosColombia } from '../src/domain/festivos.js';
import { selectorParametros, VERSIONES_SEMILLA } from '../src/domain/parametros.js';
import { clasificarHoras } from '../src/domain/horas.js';
import { liquidarQuincena, retencionMensual, consolidarMes, cotizacionPorDias } from '../src/domain/liquidacion/index.js';
import { calcularIbc } from '../src/domain/liquidacion/estrategiaSalario.js';
import { rango, weekday, diasComerciales } from '../src/domain/fechas.js';

const getParams = selectorParametros(VERSIONES_SEMILLA);

test('festivos 2026', () => {
  const f = festivosColombia(2026).map((x) => x.fecha);
  assert.deepEqual(f, ['2026-01-01','2026-01-12','2026-03-23','2026-04-02','2026-04-03','2026-05-01','2026-05-18','2026-06-08','2026-06-15','2026-06-29','2026-07-20','2026-08-07','2026-08-17','2026-10-12','2026-11-02','2026-11-16','2026-12-08','2026-12-25']);
});

test('parámetros por vigencia', () => {
  assert.equal(getParams('2026-06-30').recargo_dominical, 0.8);
  assert.equal(getParams('2026-07-01').recargo_dominical, 0.9);
  assert.equal(getParams('2026-07-14').jornada_semanal, 44);
  assert.equal(getParams('2026-07-15').jornada_semanal, 42);
});

test('días comerciales', () => {
  assert.equal(diasComerciales('2026-10-16', '2026-10-31'), 15);
  assert.equal(diasComerciales('2026-02-16', '2026-02-28'), 15);
  assert.equal(diasComerciales('2026-11-01', '2026-11-15'), 15);
});

// Semana lun-sáb 9:00-18:00 con 30 min de almuerzo = 8.5 h x 6 = 51 h -> 9 h extra con jornada 42
function semanaTipo(desde, hasta, festivos) {
  return rango(desde, hasta).map((fecha) => {
    const wd = weekday(fecha);
    if (wd === 0) return { fecha, estado: 'OK', entrada: '10:00', salida: '16:00', descanso_min: 0 };
    return { fecha, estado: 'OK', entrada: '09:00', salida: '18:00', descanso_min: 30 };
  });
}

test('extras semanales sobre 42 h y dominicales aparte', () => {
  const reg = semanaTipo('2026-11-02', '2026-11-08'); // 2-nov festivo (lunes)
  const fest = new Set(festivosColombia(2026).map((x) => x.fecha));
  const { totales } = clasificarHoras({ registros: reg, festivos: fest, getParams, desde: '2026-11-02', hasta: '2026-11-08' });
  // lunes festivo 8.5 h + domingo 6 h = 14.5 dominicales; hábiles 5 x 8.5 = 42.5 -> 0.5 extra
  assert.equal(totales.hdd, 14.5);
  assert.equal(totales.hod, 42);
  assert.equal(totales.hed, 0.5);
});

test('recargo nocturno desde 7 pm', () => {
  const reg = [{ fecha: '2026-11-03', estado: 'OK', entrada: '14:00', salida: '22:00', descanso_min: 0 }];
  const { totales } = clasificarHoras({ registros: reg, festivos: new Set(), getParams, desde: '2026-11-03', hasta: '2026-11-03' });
  assert.equal(totales.hod, 5);
  assert.equal(totales.hon, 3);
});

test('quincena salario mínimo: sueldo, auxilio y aportes', () => {
  const periodo = { anio: 2026, mes: 11, quincena: 1, desde: '2026-11-01', hasta: '2026-11-15' };
  const reg = rango('2026-11-01', '2026-11-15').map((fecha) => ({ fecha, estado: weekday(fecha) === 0 ? 'Descanso' : 'OK', entrada: '09:00', salida: '16:00', descanso_min: 0 }));
  const l = liquidarQuincena({ id: 1, nombre: 'X', tipo_vinculo: 'salario', salario_base: 1750905 }, { periodo, registros: reg, festivos: new Set(['2026-11-02']), getParams });
  assert.equal(l.sueldo, 875453);
  assert.equal(l.auxilio, 124548);
  // valor hora = 1.750.905 / 210 = 8337.64 ; 7 h festivo x 1.9
  const dom = l.devengos.find((d) => d.codigo === 'hdd');
  assert.equal(dom.cantidad, 7);
  assert.equal(dom.valor, Math.round(7 * (1750905 / 210) * 1.9));
  assert.equal(l.deducciones.find((d) => d.concepto === 'Salud').valor, Math.round(l.ibc * 0.04));
});

test('retención: salario de 10 millones', () => {
  const p = getParams('2026-11-30');
  const r = retencionMensual({ ingresos: 10_000_000, aportes: 800_000 + 100_000 }, p);
  // subtotal 9.1M ; exenta min(2.275M, 65.83 UVT=3.447.954) = 2.275.000 ; base 6.825.000 = 130.31 UVT -> (130.31-95)*19% = 6.71 UVT
  assert.ok(r.valor > 340000 && r.valor < 360000, String(r.valor));
});

test('consolidado con exoneración', () => {
  const p = getParams('2026-11-30');
  const c = consolidarMes({ id: 1, nombre: 'X', tipo_vinculo: 'salario', salario_base: 1750905, nivel_arl: 1 }, [{ ibc: 1750905, sueldo: 1750905, base_prestaciones: 2000000, total_devengado: 2000000, neto: 1860000 }], p);
  assert.equal(c.aportes.salud, 0);
  assert.equal(c.aportes.pension, Math.round(1750905 * 0.12));
  assert.equal(c.prestaciones.cesantias, Math.round(2000000 * 0.0833));
});

test('falta e incapacidad descuentan días; incapacidad no baja del mínimo', () => {
  const periodo = { anio: 2026, mes: 11, quincena: 1, desde: '2026-11-01', hasta: '2026-11-15' };
  const reg = rango('2026-11-01', '2026-11-15').map((fecha) => ({ fecha, estado: fecha === '2026-11-04' ? 'Falto' : fecha >= '2026-11-10' && fecha <= '2026-11-11' ? 'Incapacidad' : 'Descanso' }));
  const l = liquidarQuincena({ id: 1, nombre: 'X', tipo_vinculo: 'salario', salario_base: 1750905 }, { periodo, registros: reg, festivos: new Set(), getParams });
  assert.equal(l.dias.pagados, 12);
  assert.equal(l.incapacidad, Math.round(1750905 / 30 * 2));
});

test('festivos que coinciden el mismo lunes se unen (2025)', () => {
  const f = festivosColombia(2025);
  const fechas = f.map((x) => x.fecha);
  assert.equal(new Set(fechas).size, fechas.length);
  assert.match(f.find((x) => x.fecha === '2025-06-30').nombre, /Sagrado Corazón y San Pedro/);
});

test('forma de pago: mensual acumula la Q1 y la paga en la Q2', () => {
  const colab = { id: 1, nombre: 'M', tipo_vinculo: 'salario', salario_base: 1750905, forma_pago: 'mensual' };
  const mk = (desde, hasta) => rango(desde, hasta).map((fecha) => ({ fecha, estado: 'Descanso' }));
  const q1 = liquidarQuincena(colab, { periodo: { anio: 2026, mes: 11, quincena: 1, desde: '2026-11-01', hasta: '2026-11-15' }, registros: mk('2026-11-01', '2026-11-15'), festivos: new Set(), getParams });
  assert.equal(q1.a_pagar, 0);
  const q2 = liquidarQuincena(colab, { periodo: { anio: 2026, mes: 11, quincena: 2, desde: '2026-11-16', hasta: '2026-11-30' }, registros: mk('2026-11-16', '2026-11-30'), festivos: new Set(), getParams, anterior: q1 });
  assert.equal(q2.a_pagar, q1.neto + q2.neto);
});

test('forma de pago: un asalariado no puede quedar en diaria', () => {
  const periodo = { anio: 2026, mes: 11, quincena: 1, desde: '2026-11-01', hasta: '2026-11-15' };
  const l = liquidarQuincena({ id: 1, nombre: 'X', tipo_vinculo: 'salario', salario_base: 1750905, forma_pago: 'diaria' }, { periodo, registros: [], festivos: new Set(), getParams });
  assert.equal(l.forma_pago, 'quincenal');
  assert.equal(l.a_pagar, l.neto);
});

const Q1 = { anio: 2026, mes: 11, quincena: 1, desde: '2026-11-01', hasta: '2026-11-15' };
const Q2 = { anio: 2026, mes: 11, quincena: 2, desde: '2026-11-16', hasta: '2026-11-30' };
const lunAsab = (desde, hasta) => rango(desde, hasta).map((fecha) => ({ fecha, estado: weekday(fecha) === 0 ? 'Descanso' : 'OK', entrada: '09:00', salida: '16:00', descanso_min: 0 }));

test('jornal laboral: auxilio, sin descuentos en Q1 y aportes en Q2', () => {
  const colab = { id: 9, nombre: 'J', tipo_vinculo: 'jornal', valor_dia: 100000, forma_pago: 'semanal' };
  const q1 = liquidarQuincena(colab, { periodo: Q1, registros: lunAsab(Q1.desde, Q1.hasta), festivos: new Set(), getParams });
  assert.equal(q1.dias.trabajados, 12); // 1, 8 y 15 son domingo
  assert.equal(q1.auxilio, Math.round(249095 * 12 / 30));
  assert.equal(q1.deducciones.length, 0);
  const q2 = liquidarQuincena(colab, { periodo: Q2, registros: lunAsab(Q2.desde, Q2.hasta), festivos: new Set(), getParams, anterior: q1 });
  // 25 días y 2.500.000 en el mes: gana más de un mínimo, cotiza normal sobre lo devengado
  assert.equal(q2.cotizacion.porSemanas, false);
  assert.equal(q2.deducciones.find((d) => d.concepto === 'Salud').valor, Math.round(q2.cotizacion.ibc * 0.04));
});

test('cotización por semanas (Decreto 2616)', () => {
  const p = getParams('2026-11-30');
  assert.deepEqual({ ...cotizacionPorDias({ diasMes: 6, ingresoMes: 300000 }, p), ibc: undefined }, { porSemanas: true, semanas: 1, ibc: undefined, ibcArl: 1750905, salud: false });
  assert.equal(cotizacionPorDias({ diasMes: 10, ingresoMes: 500000 }, p).ibc, Math.round(2 * 1750905 / 4));
  assert.equal(cotizacionPorDias({ diasMes: 18, ingresoMes: 1800000 }, p).porSemanas, false);
});

test('art. 134: un jornal no se paga por quincena', () => {
  const l = liquidarQuincena({ id: 9, nombre: 'J', tipo_vinculo: 'jornal', valor_dia: 100000, forma_pago: 'quincenal' }, { periodo: Q1, registros: lunAsab(Q1.desde, Q1.hasta), festivos: new Set(), getParams });
  assert.equal(l.forma_pago, 'semanal');
  assert.ok(l.alertas.some((a) => a.includes('no aplica')));
});

test('pago semanal: las semanas cerradas ya se pagaron, al cierre quedan los días sueltos', () => {
  const l = liquidarQuincena({ id: 9, nombre: 'J', tipo_vinculo: 'jornal', valor_dia: 100000, forma_pago: 'semanal' }, { periodo: Q2, registros: lunAsab(Q2.desde, Q2.hasta), festivos: new Set(), getParams });
  // 16-22 y 23-29 se pagan en la semana; el 30 (lunes) queda para el cierre
  assert.equal(l.dias.trabajados, 13);
  assert.equal(l.a_pagar, l.neto - Math.round(l.pago_dias_total * 12 / 13));
});

test('pago diario: al cierre solo queda el saldo de novedades', () => {
  const l = liquidarQuincena({ id: 9, nombre: 'J', tipo_vinculo: 'jornal', valor_dia: 100000, forma_pago: 'diaria' }, { periodo: Q1, registros: lunAsab(Q1.desde, Q1.hasta), festivos: new Set(), getParams, novedades: [{ tipo: 'vale', valor: 30000 }] });
  assert.equal(l.a_pagar, -30000);
});

test('prestación de servicios: sin aportes, cualquier forma de pago', () => {
  const l = liquidarQuincena({ id: 9, nombre: 'S', tipo_vinculo: 'servicios', valor_dia: 100000, forma_pago: 'quincenal' }, { periodo: Q1, registros: lunAsab(Q1.desde, Q1.hasta), festivos: new Set(), getParams });
  assert.equal(l.neto, 1200000);
  assert.equal(l.a_pagar, 1200000);
});

test('IBC: piso de un mínimo, techo de 25 y regla del 40 %', () => {
  const p = getParams('2026-11-30');
  assert.equal(calcularIbc({ salarial: 500000, noSalarial: 0, dias: 15 }, p).ibc, Math.round(1750905 / 2));
  assert.equal(calcularIbc({ salarial: 100_000_000, noSalarial: 0, dias: 15 }, p).ibc, Math.round(25 * 1750905 / 2));
  const r = calcularIbc({ salarial: 1_000_000, noSalarial: 1_000_000, dias: 15 }, p);
  assert.equal(r.excedente40, 200000); // 1M - 40 % de 2M
  assert.equal(r.ibc, 1200000);
});

test('salario integral: IBC al 70 %, sin auxilio ni prima', () => {
  const colab = { id: 1, nombre: 'I', tipo_vinculo: 'integral', salario_base: 25_000_000, forma_pago: 'mensual' };
  const l = liquidarQuincena(colab, { periodo: Q1, registros: [], festivos: new Set(), getParams });
  assert.equal(l.auxilio, 0);
  assert.equal(l.ibc, Math.round(12_500_000 * 0.7));
  const c = consolidarMes(colab, [l], getParams('2026-11-30'));
  assert.equal(c.prestaciones.prima, 0);
  assert.ok(c.prestaciones.vacaciones > 0);
});

test('alerta por más de 2 h extra en un día', () => {
  const reg = [
    ...rango('2026-11-09', '2026-11-13').map((fecha) => ({ fecha, estado: 'OK', entrada: '08:00', salida: '16:00', descanso_min: 0 })),
    { fecha: '2026-11-14', estado: 'OK', entrada: '06:00', salida: '20:00', descanso_min: 0 },
  ];
  const l = liquidarQuincena({ id: 1, nombre: 'X', tipo_vinculo: 'salario', salario_base: 1750905, forma_pago: 'quincenal' }, { periodo: Q1, registros: reg, festivos: new Set(), getParams });
  assert.ok(l.alertas.some((a) => a.includes('en el día: 14')), l.alertas.join(' | '));
});

import { liquidarContrato } from '../src/domain/liquidacion/index.js';
import { dias360 } from '../src/domain/fechas.js';

test('días 360', () => {
  assert.equal(dias360('2026-01-01', '2026-12-31'), 360);
  assert.equal(dias360('2026-01-01', '2026-06-30'), 180);
  assert.equal(dias360('2026-02-01', '2026-02-28'), 30);
});

test('liquidación de contrato: despido sin justa causa, indefinido, salario mínimo', () => {
  const p = getParams('2026-11-30');
  const c = { id: 1, nombre: 'X', tipo_vinculo: 'salario', salario_base: 1750905, fecha_ingreso: '2024-11-01', tipo_contrato: 'indefinido', dias_vacaciones_tomadas: 15 };
  const l = liquidarContrato(c, { fecha_retiro: '2026-10-31', motivo: 'sin_justa_causa' }, p);
  const v = (n) => l.conceptos.find((x) => x.concepto.startsWith(n));
  const base = 1750905 + 249095;
  assert.equal(v('Cesantías').dias, 300);
  assert.equal(v('Cesantías').valor, Math.round(base * 300 / 360));
  assert.equal(v('Prima').dias, 120);
  assert.equal(v('Vacaciones').dias, 15); // 2 años = 30 días ganados, 15 tomados
  assert.equal(v('Indemnización').dias, 50); // 30 + 1 año adicional x 20
  assert.equal(v('Indemnización').valor, Math.round(1750905 / 30 * 50));
});

test('liquidación de contrato: renuncia no tiene indemnización; integral sin cesantías', () => {
  const p = getParams('2026-11-30');
  const r = liquidarContrato({ id: 1, nombre: 'X', tipo_vinculo: 'salario', salario_base: 2000000, fecha_ingreso: '2026-03-01' }, { fecha_retiro: '2026-08-15', motivo: 'renuncia' }, p);
  assert.ok(!r.conceptos.some((x) => x.concepto.startsWith('Indemnización')));
  const i = liquidarContrato({ id: 2, nombre: 'I', tipo_vinculo: 'integral', salario_base: 25000000, fecha_ingreso: '2025-01-01' }, { fecha_retiro: '2026-06-30', motivo: 'sin_justa_causa' }, p);
  assert.ok(!i.conceptos.some((x) => x.concepto === 'Cesantías'));
  assert.equal(i.conceptos.find((x) => x.concepto.startsWith('Indemnización')).dias, 27.5); // 20 + 0,5 x 15
});

test('término fijo: salarios que faltaban', () => {
  const p = getParams('2026-11-30');
  const l = liquidarContrato({ id: 1, nombre: 'F', tipo_vinculo: 'salario', salario_base: 3000000, fecha_ingreso: '2026-01-01', tipo_contrato: 'fijo', fecha_fin_contrato: '2026-12-31' }, { fecha_retiro: '2026-10-31', motivo: 'sin_justa_causa' }, p);
  assert.equal(l.conceptos.find((x) => x.concepto.startsWith('Indemnización')).dias, 60);
});

test('retención con dependientes y medicina prepagada', () => {
  const p = getParams('2026-11-30');
  const sin = retencionMensual({ ingresos: 10_000_000, aportes: 900_000 }, p);
  const con = retencionMensual({ ingresos: 10_000_000, aportes: 900_000, dependientes: true, medicina: 500_000 }, p);
  assert.equal(con.deducciones, 1_000_000 + 500_000);
  assert.ok(con.valor < sin.valor);
});

test('licencia de maternidad: salario completo, sin auxilio', () => {
  const reg = rango('2026-11-01', '2026-11-15').map((fecha) => ({ fecha, estado: 'Licencia de maternidad' }));
  const l = liquidarQuincena({ id: 1, nombre: 'M', tipo_vinculo: 'salario', salario_base: 1750905, forma_pago: 'quincenal' }, { periodo: Q1, registros: reg, festivos: new Set(), getParams });
  assert.equal(l.licencias, Math.round(1750905 / 2));
  assert.equal(l.auxilio, 0);
  assert.equal(l.ibc, Math.round(1750905 / 2));
});
