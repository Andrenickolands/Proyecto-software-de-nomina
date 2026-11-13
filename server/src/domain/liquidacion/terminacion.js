// Liquidación final cuando termina el contrato (CST arts. 64, 186, 249, 306 y Ley 52 de 1975).
// Supone que las cesantías de años anteriores ya se consignaron al fondo (antes del 14 de febrero)
// y que la prima del semestre anterior ya se pagó. El salario de los últimos días se paga en la
// quincena normal (la app lo liquida hasta la fecha de retiro).
import { dias360 } from '../fechas.js';
import { redondear } from './aportes.js';

export const MOTIVOS = {
  renuncia: 'Renuncia del trabajador',
  justa_causa: 'Despido con justa causa',
  sin_justa_causa: 'Despido sin justa causa',
  mutuo_acuerdo: 'Mutuo acuerdo',
  fin_contrato: 'Terminación del plazo u obra',
};

export const TIPOS_CONTRATO = { indefinido: 'Término indefinido', fijo: 'Término fijo', obra: 'Obra o labor' };

const max = (a, b) => (a > b ? a : b);

export function liquidarContrato(colaborador, { fecha_retiro, motivo, promedio_variable = 0, dias_vacaciones_tomadas }, p) {
  if (colaborador.tipo_vinculo === 'servicios') throw new Error('Un contratista de prestación de servicios no tiene liquidación laboral.');
  const ingreso = colaborador.fecha_ingreso;
  if (!ingreso) throw new Error('El colaborador no tiene fecha de ingreso.');
  if (fecha_retiro < ingreso) throw new Error('La fecha de retiro no puede ser antes del ingreso.');

  const integral = colaborador.tipo_vinculo === 'integral';
  const jornal = colaborador.tipo_vinculo === 'jornal';
  const salario = jornal ? Number(colaborador.valor_dia || 0) * 30 : Number(colaborador.salario_base || 0);
  const variable = Number(promedio_variable) || 0;
  const conAuxilio = !integral && salario <= p.tope_aux_transporte_smmlv * p.smmlv;
  const baseSalarial = salario + variable;
  const basePrestaciones = baseSalarial + (conAuxilio ? p.auxilio_transporte : 0);
  const anio = Number(fecha_retiro.slice(0, 4));
  const conceptos = [];
  const alertas = [];

  if (!integral) {
    // cesantías e intereses del año en curso
    const desdeCes = max(ingreso, `${anio}-01-01`);
    const diasCes = dias360(desdeCes, fecha_retiro);
    const cesantias = redondear((basePrestaciones * diasCes) / 360);
    const intereses = redondear((cesantias * diasCes * p.intereses_cesantias_tasa) / 360);
    conceptos.push({ concepto: 'Cesantías', desde: desdeCes, dias: diasCes, base: redondear(basePrestaciones), valor: cesantias });
    conceptos.push({ concepto: 'Intereses de cesantías', desde: desdeCes, dias: diasCes, base: cesantias, valor: intereses });

    // prima del semestre en curso
    const inicioSemestre = Number(fecha_retiro.slice(5, 7)) <= 6 ? `${anio}-01-01` : `${anio}-07-01`;
    const desdePrima = max(ingreso, inicioSemestre);
    const diasPrima = dias360(desdePrima, fecha_retiro);
    conceptos.push({ concepto: 'Prima de servicios', desde: desdePrima, dias: diasPrima, base: redondear(basePrestaciones), valor: redondear((basePrestaciones * diasPrima) / 360) });
  }

  // vacaciones: 15 días hábiles por año, se compensan en dinero las que no se tomaron
  const diasTrabajados = dias360(ingreso, fecha_retiro);
  const ganadas = (diasTrabajados * 15) / 360;
  const tomadas = Number(dias_vacaciones_tomadas ?? colaborador.dias_vacaciones_tomadas ?? 0);
  const pendientes = Math.max(0, Math.round((ganadas - tomadas) * 100) / 100);
  conceptos.push({ concepto: 'Vacaciones no disfrutadas', dias: pendientes, base: redondear(salario), valor: redondear((salario * pendientes) / 30), detalle: `${ganadas.toLocaleString('es-CO', { maximumFractionDigits: 2 })} ganadas, ${tomadas.toLocaleString('es-CO')} tomadas` });

  // indemnización (art. 64 CST)
  if (motivo === 'sin_justa_causa') {
    const diario = baseSalarial / 30;
    const tipo = colaborador.tipo_contrato || 'indefinido';
    let diasInd = 0;
    let explicacion = '';
    if (tipo === 'indefinido') {
      const anios = diasTrabajados / 360;
      const [primer, adicional] = salario < 10 * p.smmlv ? [30, 20] : [20, 15];
      diasInd = primer + Math.max(0, anios - 1) * adicional;
      explicacion = `${primer} días el primer año y ${adicional} por cada año adicional (proporcional)`;
    } else {
      const fin = colaborador.fecha_fin_contrato;
      if (!fin) alertas.push('Falta la fecha de terminación pactada del contrato para calcular la indemnización.');
      diasInd = fin && fin > fecha_retiro ? dias360(fecha_retiro, fin) - 1 : 0;
      if (tipo === 'obra') diasInd = Math.max(diasInd, 15);
      explicacion = tipo === 'obra' ? 'el tiempo que faltaba para terminar la obra, mínimo 15 días' : 'los salarios que faltaban para terminar el contrato';
    }
    diasInd = Math.round(diasInd * 100) / 100;
    conceptos.push({ concepto: 'Indemnización por despido sin justa causa', dias: diasInd, base: redondear(baseSalarial), valor: redondear(diario * diasInd), detalle: explicacion });
    if (baseSalarial > 204 * p.uvt) alertas.push('La indemnización puede tener retención en la fuente del 20 % (art. 401-3 E.T.). Revísalo con el contador.');
  }
  if (motivo === 'mutuo_acuerdo') alertas.push('En mutuo acuerdo no hay indemnización legal; si pactaron una bonificación, agrégala aparte.');
  if (integral) alertas.push('Salario integral: la prima y las cesantías ya venían incluidas en el salario.');

  return {
    colaborador_id: colaborador.id, nombre: colaborador.nombre, documento: colaborador.documento, cargo: colaborador.cargo,
    tipo_vinculo: colaborador.tipo_vinculo, tipo_contrato: colaborador.tipo_contrato || 'indefinido',
    fecha_ingreso: ingreso, fecha_retiro, motivo, salario, promedio_variable: variable, con_auxilio: conAuxilio,
    dias_trabajados: diasTrabajados, conceptos, total: conceptos.reduce((s, c) => s + c.valor, 0), alertas,
  };
}
