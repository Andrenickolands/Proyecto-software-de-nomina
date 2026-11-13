// Acceso a la base de datos. Los servicios solo llaman estas funciones,
// así no hay SQL regado por el código. Knex arma las consultas con parámetros.
import { insertarRetornandoId } from '../db/conexion.js';

const json = (s, def = {}) => {
  try { return typeof s === 'string' ? JSON.parse(s) : s ?? def; } catch { return def; }
};
const aNumero = (fila, campos) => {
  if (!fila) return fila;
  const o = { ...fila };
  for (const c of campos) if (c in o && o[c] !== null) o[c] = Number(o[c]);
  return o;
};

export function crearRepositorios(db) {
  const usuarios = {
    porEmail: (email) => db('usuarios').where({ email }).first(),
    porId: (id) => db('usuarios').where({ id }).first(),
    listar: () => db('usuarios').select('id', 'email', 'nombre', 'rol', 'created_at').orderBy('nombre'),
    crear: (u) => insertarRetornandoId(db('usuarios'), u),
    actualizar: (id, datos) => db('usuarios').where({ id }).update({ ...datos, updated_at: db.fn.now() }),
    eliminar: (id) => db('usuarios').where({ id }).del(),
    contarAdmins: async () => Number((await db('usuarios').where({ rol: 'admin' }).count({ n: '*' }).first()).n),
    hayAlguno: async () => Boolean(await db('usuarios').first()),
  };

  const ajustes = {
    obtener: async (clave, def = {}) => json((await db('ajustes').where({ clave }).first())?.valor, def),
    guardar: (clave, valor) => db('ajustes').insert({ clave, valor: JSON.stringify(valor) }).onConflict('clave').merge(),
  };

  const parametros = {
    listar: async () => (await db('parametros').orderBy('vigente_desde')).map((f) => ({ ...f, valores: json(f.valores) })),
    porFecha: (vigente_desde) => db('parametros').where({ vigente_desde }).first(),
    porId: (id) => db('parametros').where({ id }).first(),
    crear: (p) => insertarRetornandoId(db('parametros'), { ...p, valores: JSON.stringify(p.valores) }),
    actualizar: (id, p) => db('parametros').where({ id }).update({ ...p, valores: JSON.stringify(p.valores), updated_at: db.fn.now() }),
    eliminar: (id) => db('parametros').where({ id }).del(),
    contar: async () => Number((await db('parametros').count({ n: '*' }).first()).n),
  };

  const festivos = {
    porAnio: (anio) => db('festivos').where('fecha', '>=', `${anio}-01-01`).andWhere('fecha', '<=', `${anio}-12-31`).orderBy('fecha'),
    fechas: async () => new Set((await db('festivos').select('fecha')).map((f) => f.fecha)),
    proximos: (desde, n) => db('festivos').where('fecha', '>=', desde).orderBy('fecha').limit(n),
    guardar: (lista) => db('festivos').insert(lista).onConflict('fecha').merge(),
    eliminar: (fecha) => db('festivos').where({ fecha }).del(),
    hayAlguno: async () => Boolean(await db('festivos').first()),
  };

  const sedes = {
    listar: async () => {
      const lista = await db('sedes').orderBy('nombre');
      const conteo = await db('colaboradores').where({ activo: 1 }).select('sede_id').count({ n: '*' }).groupBy('sede_id');
      return lista.map((s) => ({ ...s, colaboradores: Number(conteo.find((c) => c.sede_id === s.id)?.n || 0) }));
    },
    porId: (id) => db('sedes').where({ id }).first(),
    crear: (s) => insertarRetornandoId(db('sedes'), s),
    actualizar: (id, s) => db('sedes').where({ id }).update(s),
    eliminar: (id) => db.transaction(async (trx) => {
      await trx('colaboradores').where({ sede_id: id }).update({ sede_id: null });
      await trx('sedes').where({ id }).del();
    }),
    contar: async () => Number((await db('sedes').count({ n: '*' }).first()).n),
  };

  const NUM_COLAB = ['salario_base', 'valor_dia', 'estudia', 'activo', 'nivel_arl', 'descanso_min', 'dias_vacaciones_tomadas', 'dependientes', 'intereses_vivienda', 'medicina_prepagada'];
  const baseColab = () => db('colaboradores').leftJoin('sedes', 'sedes.id', 'colaboradores.sede_id').select('colaboradores.*', 'sedes.nombre as sede');
  const colaboradores = {
    listar: async () => (await baseColab().orderBy('colaboradores.nombre')).map((c) => aNumero(c, NUM_COLAB)),
    porId: async (id) => aNumero(await baseColab().where('colaboradores.id', id).first(), NUM_COLAB),
    porDocumento: (documento) => db('colaboradores').where({ documento }).first(),
    porIds: async (ids) => (await db('colaboradores').whereIn('id', ids)).map((c) => aNumero(c, NUM_COLAB)),
    crear: (c) => insertarRetornandoId(db('colaboradores'), c),
    actualizar: (id, c) => db('colaboradores').where({ id }).update({ ...c, updated_at: db.fn.now() }),
    eliminar: (id) => db('colaboradores').where({ id }).del(),
    contarActivos: async () => (await db('colaboradores').where({ activo: 1 }).select('tipo_vinculo')),
  };

  const periodos = {
    liquidadosEntre: (desde, hasta) => db('periodos').where({ estado: 'liquidado' }).andWhere('desde', '<=', hasta).andWhere('hasta', '>=', desde),
    listar: (limite) => {
      const q = db('periodos').orderBy([{ column: 'anio', order: 'desc' }, { column: 'mes', order: 'desc' }, { column: 'quincena', order: 'desc' }]);
      return limite ? q.limit(limite) : q;
    },
    porId: (id) => db('periodos').where({ id }).first(),
    porClave: (anio, mes, quincena) => db('periodos').where({ anio, mes, quincena }).first(),
    delMes: (anio, mes) => db('periodos').where({ anio, mes }).orderBy('quincena'),
    crear: (p) => insertarRetornandoId(db('periodos'), p),
  };

  const asistencia = {
    entre: (desde, hasta) => db('asistencia').whereBetween('fecha', [desde, hasta]).orderBy('fecha'),
    insertarLote: async (filas) => {
      for (let i = 0; i < filas.length; i += 200) await db('asistencia').insert(filas.slice(i, i + 200));
    },
    eliminarRango: (desde, hasta, colaboradorIds) =>
      db('asistencia').whereBetween('fecha', [desde, hasta]).whereIn('colaborador_id', colaboradorIds).del(),
    guardar: (filas) => db.transaction(async (trx) => {
      for (const f of filas) await trx('asistencia').insert(f).onConflict(['colaborador_id', 'fecha']).merge();
    }),
  };

  const terminaciones = {
    listar: async () => (await db('terminaciones').orderBy('id', 'desc')).map((t) => ({ ...t, total: Number(t.total), detalle: json(t.detalle) })),
    // guarda la liquidación y deja a la persona retirada, todo junto
    crear: (t, colaboradorId) => db.transaction(async (trx) => {
      const id = await insertarRetornandoId(trx('terminaciones'), { ...t, detalle: JSON.stringify(t.detalle) });
      await trx('colaboradores').where({ id: colaboradorId }).update({ fecha_retiro: t.fecha_retiro, activo: 0 });
      return id;
    }),
    eliminar: (id) => db('terminaciones').where({ id }).del(),
  };

  const novedades = {
    porPeriodo: async (periodo_id) => (await db('novedades').join('colaboradores', 'colaboradores.id', 'novedades.colaborador_id')
      .where({ periodo_id }).select('novedades.*', 'colaboradores.nombre')).map((n) => aNumero(n, ['valor'])),
    porId: (id) => db('novedades').where({ id }).first(),
    crear: (n) => insertarRetornandoId(db('novedades'), n),
    eliminar: (id) => db('novedades').where({ id }).del(),
  };

  // liquidar y reabrir van en transacción para no dejar la quincena a medias
  const liquidaciones = {
    porPeriodo: async (periodo_id) => (await db('liquidaciones').where({ periodo_id })).map((f) => json(f.detalle)),
    // quincenas liquidadas de una persona desde una fecha (para el promedio de lo variable)
    deColaborador: async (colaborador_id, desde) => (await db('liquidaciones').join('periodos', 'periodos.id', 'liquidaciones.periodo_id')
      .where('liquidaciones.colaborador_id', colaborador_id).andWhere('periodos.desde', '>=', desde).select('liquidaciones.detalle')).map((f) => json(f.detalle)),
    cerrarPeriodo: (periodoId, filas) => db.transaction(async (trx) => {
      await trx('liquidaciones').where({ periodo_id: periodoId }).del();
      for (const f of filas) {
        await trx('liquidaciones').insert({ periodo_id: periodoId, colaborador_id: f.colaborador_id, detalle: JSON.stringify(f), neto: f.neto });
      }
      await trx('periodos').where({ id: periodoId }).update({ estado: 'liquidado', liquidado_en: new Date().toISOString() });
    }),
    reabrirPeriodo: (periodoId) => db.transaction(async (trx) => {
      await trx('liquidaciones').where({ periodo_id: periodoId }).del();
      await trx('periodos').where({ id: periodoId }).update({ estado: 'abierto', liquidado_en: null });
    }),
  };

  const auditoria = {
    registrar: (e) => db('auditoria').insert({ ...e, detalle: e.detalle ? JSON.stringify(e.detalle) : null }),
    recientes: (n = 50) => db('auditoria').orderBy('id', 'desc').limit(n),
  };

  return { usuarios, ajustes, parametros, festivos, sedes, colaboradores, periodos, asistencia, novedades, liquidaciones, terminaciones, auditoria };
}
