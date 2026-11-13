import { PARAMETROS_BASE } from '../domain/parametros.js';
import { festivosColombia } from '../domain/festivos.js';
import { EMPRESA_DEFECTO } from '../infrastructure/db/semilla.js';
import { conflicto, invalido, noEncontrado } from './errores.js';

export function crearConfiguracionService({ repos, contexto }) {
  const auditar = (actor, accion, entidad, entidad_id, detalle) =>
    repos.auditoria.registrar({ usuario_id: actor.id, usuario_email: actor.email, accion, entidad, entidad_id: entidad_id && String(entidad_id), detalle });

  return {
    obtenerEmpresa: async () => ({ ...EMPRESA_DEFECTO, ...(await repos.ajustes.obtener('empresa')) }),
    async guardarEmpresa(actor, datos) {
      const valor = { ...EMPRESA_DEFECTO, ...datos };
      await repos.ajustes.guardar('empresa', valor);
      await auditar(actor, 'actualizar_empresa', 'empresa');
      return valor;
    },

    listarParametros: () => repos.parametros.listar(),
    async parametrosVigentes(fecha) {
      const { getParams } = await contexto.obtener();
      return { fecha, valores: getParams(fecha) };
    },
    async crearParametros(actor, { vigente_desde, nombre, valores }) {
      if (await repos.parametros.porFecha(vigente_desde)) throw conflicto('Ya existe una versión con esa fecha de vigencia.');
      const id = await repos.parametros.crear({ vigente_desde, nombre: nombre || `Vigente desde ${vigente_desde}`, valores: { ...PARAMETROS_BASE, ...valores } });
      await auditar(actor, 'crear_parametros', 'parametros', id, { vigente_desde });
      return { id };
    },
    async actualizarParametros(actor, id, { vigente_desde, nombre, valores }) {
      if (!(await repos.parametros.porId(id))) throw noEncontrado('Esa versión de parámetros no existe.');
      const otra = await repos.parametros.porFecha(vigente_desde);
      if (otra && otra.id !== id) throw conflicto('Ya existe otra versión con esa fecha de vigencia.');
      await repos.parametros.actualizar(id, { vigente_desde, nombre, valores: { ...PARAMETROS_BASE, ...valores } });
      await auditar(actor, 'actualizar_parametros', 'parametros', id, { vigente_desde, valores });
    },
    async eliminarParametros(actor, id) {
      if ((await repos.parametros.contar()) <= 1) throw invalido('Debe quedar al menos una versión de parámetros.');
      await repos.parametros.eliminar(id);
      await auditar(actor, 'eliminar_parametros', 'parametros', id);
    },

    festivosDelAnio: (anio) => repos.festivos.porAnio(anio),
    async guardarFestivo(actor, festivo) {
      await repos.festivos.guardar([festivo]);
      await auditar(actor, 'guardar_festivo', 'festivo', festivo.fecha);
      return festivo;
    },
    async generarFestivos(actor, anio) {
      await repos.festivos.guardar(festivosColombia(anio));
      await auditar(actor, 'generar_festivos', 'festivo', anio);
      return repos.festivos.porAnio(anio);
    },
    async eliminarFestivo(actor, fecha) {
      await repos.festivos.eliminar(fecha);
      await auditar(actor, 'eliminar_festivo', 'festivo', fecha);
    },

    auditoria: (n) => repos.auditoria.recientes(n),
  };
}
