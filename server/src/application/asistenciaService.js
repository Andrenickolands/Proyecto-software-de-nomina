import { clasificarHoras, ESTADOS, LISTA_ESTADOS } from '../domain/horas.js';
import { inicioSemana, rango, weekday, dias360 } from '../domain/fechas.js';
import { conflicto, invalido, noEncontrado } from './errores.js';

// quienes estaban contratados en algún día del periodo
export const vigentesEn = (colaboradores, periodo) => colaboradores.filter((c) =>
  (!c.fecha_ingreso || c.fecha_ingreso <= periodo.hasta) &&
  (!c.fecha_retiro || c.fecha_retiro >= periodo.desde) &&
  (c.activo || (c.fecha_retiro && c.fecha_retiro >= periodo.desde)));

// cómo queda un día según el horario base de la persona
export function registroSugerido(c, fecha, festivos) {
  const vacio = { entrada: null, salida: null, descanso_min: 0 };
  if ((c.fecha_ingreso && fecha < c.fecha_ingreso) || (c.fecha_retiro && fecha > c.fecha_retiro)) return { estado: ESTADOS.NO_TRABAJA, ...vacio };
  if (c.dia_descanso !== null && c.dia_descanso !== undefined && Number(c.dia_descanso) === weekday(fecha)) return { estado: ESTADOS.DESCANSO, ...vacio };
  if (weekday(fecha) === 0 || festivos.has(fecha)) return { estado: ESTADOS.OK, entrada: c.entrada_dom, salida: c.salida_dom, descanso_min: 0 };
  return { estado: ESTADOS.OK, entrada: c.entrada, salida: c.salida, descanso_min: Number(c.descanso_min || 0) };
}

export function crearAsistenciaService({ repos, contexto }) {
  const exigirPeriodo = async (id) => {
    const p = await repos.periodos.porId(id);
    if (!p) throw noEncontrado('Ese periodo no existe.');
    return p;
  };
  const exigirAbierto = (p) => {
    if (p.estado === 'liquidado') throw conflicto('La quincena ya está liquidada. Reábrela para hacer cambios.');
  };

  return {
    exigirPeriodo,
    exigirAbierto,

    async obtener(periodoId) {
      const periodo = await exigirPeriodo(periodoId);
      const ctx = await contexto.obtener();
      const colabs = vigentesEn(await repos.colaboradores.listar(), periodo);
      const regs = await repos.asistencia.entre(inicioSemana(periodo.desde), periodo.hasta);
      const filas = colabs.map((c) => {
        const propios = regs.filter((r) => r.colaborador_id === c.id);
        const { dias, totales } = clasificarHoras({ registros: propios, ...ctx, desde: periodo.desde, hasta: periodo.hasta });
        return {
          colaborador: c,
          registros: Object.fromEntries(propios.filter((r) => r.fecha >= periodo.desde).map((r) => [r.fecha, r])),
          horas: Object.fromEntries(dias.map((d) => [d.fecha, d])),
          totales,
        };
      });
      return { periodo, filas, festivos: [...ctx.festivos].filter((f) => f >= periodo.desde && f <= periodo.hasta) };
    },

    async generar(actor, periodoId, { sobrescribir = false } = {}) {
      const periodo = await exigirPeriodo(periodoId);
      exigirAbierto(periodo);
      const { festivos } = await contexto.obtener();
      const colabs = vigentesEn(await repos.colaboradores.listar(), periodo);
      const existentes = new Set((await repos.asistencia.entre(periodo.desde, periodo.hasta)).map((e) => `${e.colaborador_id}|${e.fecha}`));
      const nuevos = [];
      for (const c of colabs) {
        for (const fecha of rango(periodo.desde, periodo.hasta)) {
          if (!sobrescribir && existentes.has(`${c.id}|${fecha}`)) continue;
          nuevos.push({ colaborador_id: c.id, fecha, ...registroSugerido(c, fecha, festivos) });
        }
      }
      if (sobrescribir) await repos.asistencia.eliminarRango(periodo.desde, periodo.hasta, colabs.map((c) => c.id));
      await repos.asistencia.insertarLote(nuevos);
      await repos.auditoria.registrar({ usuario_id: actor.id, usuario_email: actor.email, accion: 'generar_asistencia', entidad: 'periodo', entidad_id: String(periodo.id), detalle: { creados: nuevos.length, sobrescribir } });
      return { creados: nuevos.length };
    },

    // para licencias, vacaciones o incapacidades largas que cruzan varias quincenas
    async registrarRango(actor, { colaborador_id, estado, desde, hasta, observacion }) {
      if (hasta < desde) throw invalido('La fecha final no puede ser antes de la inicial.');
      if (dias360(desde, hasta) > 400) throw invalido('El rango no puede pasar de un año.');
      const cerrados = await repos.periodos.liquidadosEntre(desde, hasta);
      if (cerrados.length) throw conflicto('Parte del rango cae en una quincena ya liquidada. Reábrela primero.');
      const filas = rango(desde, hasta).map((fecha) => ({ colaborador_id, fecha, estado, entrada: null, salida: null, descanso_min: 0, observacion: observacion || null }));
      await repos.asistencia.guardar(filas);
      await repos.auditoria.registrar({ usuario_id: actor.id, usuario_email: actor.email, accion: 'registrar_rango', entidad: 'colaborador', entidad_id: String(colaborador_id), detalle: { estado, desde, hasta } });
      return { guardados: filas.length };
    },

    async guardar(actor, periodoId, registros) {
      const periodo = await exigirPeriodo(periodoId);
      exigirAbierto(periodo);
      const filas = registros.map((r) => {
        if (r.fecha < periodo.desde || r.fecha > periodo.hasta) throw invalido(`La fecha ${r.fecha} no pertenece a la quincena.`);
        if (!LISTA_ESTADOS.includes(r.estado)) throw invalido(`Estado no válido: ${r.estado}`);
        const trabaja = r.estado === ESTADOS.OK;
        if (trabaja && (!r.entrada || !r.salida)) throw invalido(`Falta la hora de entrada o salida del ${r.fecha}.`);
        return {
          colaborador_id: r.colaborador_id, fecha: r.fecha, estado: r.estado,
          entrada: trabaja ? r.entrada : null, salida: trabaja ? r.salida : null,
          descanso_min: trabaja ? Number(r.descanso_min || 0) : 0, observacion: r.observacion || null,
        };
      });
      await repos.asistencia.guardar(filas);
      return { guardados: filas.length };
    },
  };
}
