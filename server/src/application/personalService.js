import { conflicto, noEncontrado, invalido } from './errores.js';
import { liquidarContrato } from '../domain/liquidacion/index.js';
import { addDays } from '../domain/fechas.js';

export function crearPersonalService({ repos, contexto }) {
  const auditar = (actor, accion, entidad, id) =>
    repos.auditoria.registrar({ usuario_id: actor.id, usuario_email: actor.email, accion, entidad, entidad_id: String(id) });

  const exigirColab = async (id) => {
    const c = await repos.colaboradores.porId(id);
    if (!c) throw noEncontrado('Ese colaborador no existe.');
    return c;
  };

  // promedio mensual de extras, recargos y devengos salariales del último año
  async function promedioVariable(c, fechaRetiro) {
    const liqs = await repos.liquidaciones.deColaborador(c.id, addDays(fechaRetiro, -365));
    if (!liqs.length) return 0;
    const variable = liqs.reduce((s, l) => s + (l.extras || 0) + (l.devengos_salariales || 0), 0);
    return Math.round(variable / (liqs.length / 2));
  }

  async function calcular(id, datos) {
    const c = await exigirColab(id);
    const { getParams } = await contexto.obtener();
    const promedio = datos.promedio_variable ?? (await promedioVariable(c, datos.fecha_retiro));
    try {
      return liquidarContrato(c, { ...datos, promedio_variable: promedio }, getParams(datos.fecha_retiro));
    } catch (e) {
      throw invalido(e.message);
    }
  }

  return {
    calcularTerminacion: calcular,
    async guardarTerminacion(actor, id, datos) {
      const liq = await calcular(id, datos);
      const tid = await repos.terminaciones.crear({ colaborador_id: id, fecha_retiro: liq.fecha_retiro, motivo: liq.motivo, detalle: liq, total: liq.total }, id);
      await auditar(actor, 'liquidar_contrato', 'colaborador', id);
      return { id: tid, ...liq };
    },
    listarTerminaciones: () => repos.terminaciones.listar(),
    async eliminarTerminacion(actor, id) {
      await repos.terminaciones.eliminar(id);
      await auditar(actor, 'eliminar_liquidacion_contrato', 'terminacion', id);
    },

    listarSedes: () => repos.sedes.listar(),
    async crearSede(actor, datos) {
      const id = await repos.sedes.crear(datos);
      await auditar(actor, 'crear_sede', 'sede', id);
      return repos.sedes.porId(id);
    },
    async actualizarSede(actor, id, datos) {
      if (!(await repos.sedes.porId(id))) throw noEncontrado('Esa sede no existe.');
      await repos.sedes.actualizar(id, datos);
      await auditar(actor, 'actualizar_sede', 'sede', id);
      return repos.sedes.porId(id);
    },
    async eliminarSede(actor, id) {
      await repos.sedes.eliminar(id);
      await auditar(actor, 'eliminar_sede', 'sede', id);
    },

    listarColaboradores: () => repos.colaboradores.listar(),
    obtenerColaborador: exigirColab,
    async crearColaborador(actor, datos) {
      if (await repos.colaboradores.porDocumento(datos.documento)) throw conflicto('Ya existe un colaborador con ese documento.');
      const id = await repos.colaboradores.crear(datos);
      await auditar(actor, 'crear_colaborador', 'colaborador', id);
      return repos.colaboradores.porId(id);
    },
    async actualizarColaborador(actor, id, datos) {
      await exigirColab(id);
      if (datos.documento) {
        const otro = await repos.colaboradores.porDocumento(datos.documento);
        if (otro && otro.id !== id) throw conflicto('Ya existe otro colaborador con ese documento.');
      }
      await repos.colaboradores.actualizar(id, datos);
      await auditar(actor, 'actualizar_colaborador', 'colaborador', id);
      return repos.colaboradores.porId(id);
    },
    async eliminarColaborador(actor, id) {
      await exigirColab(id);
      await repos.colaboradores.eliminar(id);
      await auditar(actor, 'eliminar_colaborador', 'colaborador', id);
    },
  };
}
