// Cada tipo de vinculación tiene su propia forma de liquidar.
// Para agregar otro, por ejemplo aprendiz SENA, se crea su archivo y se registra aquí.
import { estrategiaSalario, estrategiaIntegral } from './estrategiaSalario.js';
import { estrategiaJornal } from './estrategiaJornal.js';
import { estrategiaServicios } from './estrategiaServicios.js';
import { aplicarFormaPago } from './formaPago.js';

const registro = new Map([estrategiaSalario, estrategiaIntegral, estrategiaJornal, estrategiaServicios].map((e) => [e.tipo, e]));

export const registrarEstrategia = (estrategia) => registro.set(estrategia.tipo, estrategia);
export const tiposVinculo = () => [...registro.values()].map(({ tipo, nombre, formasPago: fp }) => ({ tipo, nombre, formas_pago: fp }));
export const formasPermitidas = (tipo) => registro.get(tipo)?.formasPago || [];

export function estrategiaPara(colaborador) {
  const e = registro.get(colaborador.tipo_vinculo || 'salario');
  if (!e) throw new Error(`No hay estrategia de liquidación para "${colaborador.tipo_vinculo}"`);
  return e;
}

const identidad = (c) => ({ colaborador_id: c.id, nombre: c.nombre, documento: c.documento, cargo: c.cargo });

export function liquidarQuincena(colaborador, ctx) {
  const e = estrategiaPara(colaborador);
  return aplicarFormaPago(colaborador, { ...identidad(colaborador), ...e.liquidar(colaborador, ctx) }, ctx, e.formasPago);
}
export const consolidarMes = (colaborador, liquidaciones, p) => ({ ...identidad(colaborador), ...estrategiaPara(colaborador).consolidar(colaborador, liquidaciones, p) });

export { TIPOS_NOVEDAD } from './novedades.js';
export { tasaFsp, retencionMensual, cotizacionPorDias } from './aportes.js';
export { formasPago } from './formaPago.js';
export { pagoPorDia } from './estrategiaJornal.js';
export { liquidarContrato, MOTIVOS, TIPOS_CONTRATO } from './terminacion.js';
