// Crea las tablas que no existan. Se puede correr varias veces sin problema.
async function crearTabla(db, nombre, fn) {
  if (!(await db.schema.hasTable(nombre))) await db.schema.createTable(nombre, fn);
}

async function agregarColumna(db, tabla, columna, fn) {
  if (!(await db.schema.hasColumn(tabla, columna))) await db.schema.alterTable(tabla, fn);
}

export async function migrar(db) {
  await crearTabla(db, 'usuarios', (t) => {
    t.increments('id');
    t.string('email').notNullable().unique();
    t.string('nombre').notNullable();
    t.string('password_hash').notNullable();
    t.string('rol').notNullable().defaultTo('admin'); // admin | consulta
    t.timestamps(true, true);
  });
  await crearTabla(db, 'ajustes', (t) => {
    t.string('clave').primary();
    t.text('valor').notNullable();
  });
  await crearTabla(db, 'parametros', (t) => {
    t.increments('id');
    t.string('vigente_desde', 10).notNullable().unique();
    t.string('nombre').notNullable();
    t.text('valores').notNullable();
    t.timestamps(true, true);
  });
  await crearTabla(db, 'festivos', (t) => {
    t.string('fecha', 10).primary();
    t.string('nombre').notNullable();
  });
  await crearTabla(db, 'sedes', (t) => {
    t.increments('id');
    t.string('nombre').notNullable();
    t.string('direccion');
    t.string('ciudad');
  });
  await crearTabla(db, 'colaboradores', (t) => {
    t.increments('id');
    t.string('documento').notNullable().unique();
    t.string('nombre').notNullable();
    t.string('cargo');
    t.integer('sede_id').references('sedes.id').onDelete('SET NULL');
    t.string('tipo_vinculo').notNullable().defaultTo('salario');
    t.decimal('salario_base', 14, 2).defaultTo(0);
    t.decimal('valor_dia', 14, 2).defaultTo(0);
    t.string('fecha_ingreso', 10);
    t.string('fecha_retiro', 10);
    t.integer('nivel_arl').defaultTo(1);
    t.string('eps');
    t.string('afp');
    t.integer('estudia').defaultTo(0);
    t.string('tipo_horario').defaultTo('extendido');
    t.integer('dia_descanso');
    t.string('entrada', 5).defaultTo('09:00');
    t.string('salida', 5).defaultTo('18:00');
    t.string('entrada_dom', 5).defaultTo('10:00');
    t.string('salida_dom', 5).defaultTo('16:00');
    t.integer('descanso_min').defaultTo(30);
    t.string('forma_pago').defaultTo('quincenal');
    t.string('tipo_contrato').defaultTo('indefinido');
    t.string('fecha_fin_contrato', 10);
    t.decimal('dias_vacaciones_tomadas', 8, 2).defaultTo(0);
    t.integer('dependientes').defaultTo(0);
    t.decimal('intereses_vivienda', 14, 2).defaultTo(0);
    t.decimal('medicina_prepagada', 14, 2).defaultTo(0);
    t.integer('activo').defaultTo(1);
    t.timestamps(true, true);
  });
  await crearTabla(db, 'periodos', (t) => {
    t.increments('id');
    t.integer('anio').notNullable();
    t.integer('mes').notNullable();
    t.integer('quincena').notNullable();
    t.string('desde', 10).notNullable();
    t.string('hasta', 10).notNullable();
    t.string('estado').notNullable().defaultTo('abierto');
    t.string('liquidado_en');
    t.unique(['anio', 'mes', 'quincena']);
  });
  await crearTabla(db, 'asistencia', (t) => {
    t.increments('id');
    t.integer('colaborador_id').notNullable().references('colaboradores.id').onDelete('CASCADE');
    t.string('fecha', 10).notNullable();
    t.string('estado').notNullable().defaultTo('OK');
    t.string('entrada', 5);
    t.string('salida', 5);
    t.integer('descanso_min').defaultTo(0);
    t.string('observacion');
    t.unique(['colaborador_id', 'fecha']);
    t.index(['fecha']);
  });
  await crearTabla(db, 'novedades', (t) => {
    t.increments('id');
    t.integer('colaborador_id').notNullable().references('colaboradores.id').onDelete('CASCADE');
    t.integer('periodo_id').notNullable().references('periodos.id').onDelete('CASCADE');
    t.string('tipo').notNullable();
    t.decimal('valor', 14, 2).notNullable();
    t.string('descripcion');
  });
  await crearTabla(db, 'liquidaciones', (t) => {
    t.increments('id');
    t.integer('periodo_id').notNullable().references('periodos.id').onDelete('CASCADE');
    t.integer('colaborador_id').notNullable();
    t.text('detalle').notNullable();
    t.decimal('neto', 14, 2).notNullable();
    t.unique(['periodo_id', 'colaborador_id']);
  });
  await crearTabla(db, 'terminaciones', (t) => {
    t.increments('id');
    t.integer('colaborador_id').notNullable().references('colaboradores.id').onDelete('CASCADE');
    t.string('fecha_retiro', 10).notNullable();
    t.string('motivo').notNullable();
    t.text('detalle').notNullable();
    t.decimal('total', 14, 2).notNullable();
    t.timestamp('creado_en').defaultTo(db.fn.now());
  });
  await crearTabla(db, 'auditoria', (t) => {
    t.increments('id');
    t.integer('usuario_id');
    t.string('usuario_email');
    t.string('accion').notNullable();
    t.string('entidad');
    t.string('entidad_id');
    t.text('detalle');
    t.timestamp('creado_en').defaultTo(db.fn.now());
  });

  // columnas nuevas para bases que ya estaban creadas
  await agregarColumna(db, 'colaboradores', 'forma_pago', (t) => t.string('forma_pago').defaultTo('quincenal'));
  await agregarColumna(db, 'colaboradores', 'tipo_contrato', (t) => t.string('tipo_contrato').defaultTo('indefinido'));
  await agregarColumna(db, 'colaboradores', 'fecha_fin_contrato', (t) => t.string('fecha_fin_contrato', 10));
  await agregarColumna(db, 'colaboradores', 'dias_vacaciones_tomadas', (t) => t.decimal('dias_vacaciones_tomadas', 8, 2).defaultTo(0));
  await agregarColumna(db, 'colaboradores', 'dependientes', (t) => t.integer('dependientes').defaultTo(0));
  await agregarColumna(db, 'colaboradores', 'intereses_vivienda', (t) => t.decimal('intereses_vivienda', 14, 2).defaultTo(0));
  await agregarColumna(db, 'colaboradores', 'medicina_prepagada', (t) => t.decimal('medicina_prepagada', 14, 2).defaultTo(0));
}
