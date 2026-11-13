import { liquidarQuincena, consolidarMes, TIPOS_NOVEDAD, pagoPorDia } from '../domain/liquidacion/index.js';
import { fechasQuincena, inicioSemana, addDays } from '../domain/fechas.js';
import { vigentesEn } from './asistenciaService.js';
import { invalido, noEncontrado } from './errores.js';

// las quincenas liquidadas antes de agregar la forma de pago no tienen a_pagar
const conPago = (f) => ({ forma_pago: 'quincenal', ya_pagado: 0, ...f, a_pagar: f.a_pagar ?? f.neto });

const totalesDe = (filas) => {
  const t = (k) => filas.reduce((s, f) => s + (Number(f[k]) || 0), 0);
  return {
    devengado: t('total_devengado'), deducciones: t('total_deducciones'), neto: t('neto'),
    a_pagar: t('a_pagar'), ya_pagado: t('ya_pagado'), ibc: t('ibc'), extras: t('extras'), personas: filas.length,
  };
};

export function crearNominaService({ repos, contexto, asistencia }) {
  const auditar = (actor, accion, entidad, id, detalle) =>
    repos.auditoria.registrar({ usuario_id: actor.id, usuario_email: actor.email, accion, entidad, entidad_id: String(id), detalle });

  async function calcularEnVivo(periodo) {
    const ctx = await contexto.obtener();
    const anteriores = new Map();
    if (periodo.quincena === 2) {
      const q1 = await repos.periodos.porClave(periodo.anio, periodo.mes, 1);
      if (q1) for (const l of await liquidacion(q1)) anteriores.set(l.colaborador_id, l);
    }
    const colabs = vigentesEn(await repos.colaboradores.listar(), periodo);
    const regs = await repos.asistencia.entre(inicioSemana(periodo.desde), periodo.hasta);
    const novedades = await repos.novedades.porPeriodo(periodo.id);
    return colabs.map((c) => ({
      ...liquidarQuincena(c, {
        periodo,
        registros: regs.filter((r) => r.colaborador_id === c.id),
        novedades: novedades.filter((n) => n.colaborador_id === c.id),
        anterior: anteriores.get(c.id) || null,
        ...ctx,
      }),
      sede: c.sede || null,
    }));
  }

  // si ya se liquidó se lee lo guardado, si no se calcula con los datos actuales
  async function liquidacion(periodo) {
    if (periodo.estado === 'liquidado') {
      return (await repos.liquidaciones.porPeriodo(periodo.id)).map(conPago).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
    return calcularEnVivo(periodo);
  }

  return {
    listarPeriodos: () => repos.periodos.listar(),

    async abrirPeriodo(actor, { anio, mes, quincena }) {
      const existente = await repos.periodos.porClave(anio, mes, quincena);
      if (existente) return existente;
      const id = await repos.periodos.crear({ anio, mes, quincena, ...fechasQuincena(anio, mes, quincena), estado: 'abierto' });
      await auditar(actor, 'abrir_periodo', 'periodo', id);
      return repos.periodos.porId(id);
    },

    async nomina(periodoId) {
      const periodo = await asistencia.exigirPeriodo(periodoId);
      const filas = await liquidacion(periodo);
      return { periodo, filas, totales: totalesDe(filas) };
    },

    async liquidar(actor, periodoId) {
      const periodo = await asistencia.exigirPeriodo(periodoId);
      asistencia.exigirAbierto(periodo);
      const filas = await calcularEnVivo(periodo);
      if (filas.length === 0) throw invalido('No hay colaboradores vigentes en esta quincena.');
      await repos.liquidaciones.cerrarPeriodo(periodo.id, filas);
      await auditar(actor, 'liquidar', 'periodo', periodo.id, totalesDe(filas));
      return repos.periodos.porId(periodo.id);
    },

    async reabrir(actor, periodoId) {
      const periodo = await asistencia.exigirPeriodo(periodoId);
      await repos.liquidaciones.reabrirPeriodo(periodo.id);
      await auditar(actor, 'reabrir', 'periodo', periodo.id);
      return repos.periodos.porId(periodo.id);
    },

    novedades: (periodoId) => repos.novedades.porPeriodo(periodoId),
    async agregarNovedad(actor, periodoId, datos) {
      const periodo = await asistencia.exigirPeriodo(periodoId);
      asistencia.exigirAbierto(periodo);
      if (!TIPOS_NOVEDAD[datos.tipo]) throw invalido('Elige un tipo de novedad válido.');
      if (!(await repos.colaboradores.porId(datos.colaborador_id))) throw noEncontrado('Ese colaborador no existe.');
      const id = await repos.novedades.crear({ ...datos, periodo_id: periodo.id });
      await auditar(actor, 'agregar_novedad', 'novedad', id, datos);
      return { id };
    },
    async eliminarNovedad(actor, id) {
      const n = await repos.novedades.porId(id);
      if (!n) throw noEncontrado('Esa novedad no existe.');
      asistencia.exigirAbierto(await asistencia.exigirPeriodo(n.periodo_id));
      await repos.novedades.eliminar(id);
      await auditar(actor, 'eliminar_novedad', 'novedad', id);
    },

    // a quién hay que pagarle ese día o esa semana (jornal y contratistas con pago diario o semanal).
    // la semana se corta en el borde de la quincena: lo que sobra se paga al cierre
    async pagosJornal(fecha, modo = 'dia') {
      let desde = fecha;
      let hasta = fecha;
      if (modo === 'semana') {
        const [a, m, d] = fecha.split('-').map(Number);
        const q = fechasQuincena(a, m, d <= 15 ? 1 : 2);
        desde = inicioSemana(fecha) < q.desde ? q.desde : inicioSemana(fecha);
        const domingo = addDays(inicioSemana(fecha), 6);
        hasta = domingo > q.hasta ? q.hasta : domingo;
      }
      const forma = modo === 'semana' ? 'semanal' : 'diaria';
      const { getParams } = await contexto.obtener();
      const p = getParams(hasta);
      const colabs = (await repos.colaboradores.listar()).filter((c) => ['jornal', 'servicios'].includes(c.tipo_vinculo) && c.forma_pago === forma && c.activo);
      const registros = await repos.asistencia.entre(desde, hasta);
      const filas = colabs.map((c) => {
        const dias = registros.filter((r) => r.colaborador_id === c.id && r.estado === 'OK').length;
        return { colaborador_id: c.id, nombre: c.nombre, sede: c.sede, dias, valor: Math.round(dias * pagoPorDia(c, p)) };
      });
      return { desde, hasta, modo, filas, total: filas.reduce((s, f) => s + f.valor, 0) };
    },

    async consolidado(anio, mes) {
      const periodos = await repos.periodos.delMes(anio, mes);
      const { getParams } = await contexto.obtener();
      const p = getParams(fechasQuincena(anio, mes, 2).hasta);
      const porColab = new Map();
      for (const per of periodos) {
        for (const l of await liquidacion(per)) {
          if (!porColab.has(l.colaborador_id)) porColab.set(l.colaborador_id, []);
          porColab.get(l.colaborador_id).push(l);
        }
      }
      const colabs = porColab.size ? await repos.colaboradores.porIds([...porColab.keys()]) : [];
      const filas = colabs.map((c) => consolidarMes(c, porColab.get(c.id), p)).sort((a, b) => a.nombre.localeCompare(b.nombre));
      return { anio, mes, periodos, filas, parametros: p };
    },

    async resumen(hoy) {
      const recientes = [...(await repos.periodos.listar(6))].reverse();
      const historial = [];
      for (const periodo of recientes) historial.push({ periodo, ...totalesDe(await liquidacion(periodo)) });
      const activos = await repos.colaboradores.contarActivos();
      const { getParams } = await contexto.obtener();
      return {
        historial,
        activos: activos.length,
        jornales: activos.filter((c) => c.tipo_vinculo === 'jornal').length,
        sedes: await repos.sedes.contar(),
        parametros: getParams(hoy),
        proximos_festivos: await repos.festivos.proximos(hoy, 3),
      };
    },
  };
}
