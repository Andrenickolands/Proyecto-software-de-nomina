// Validación de todo lo que llega del navegador
import { z } from 'zod';

z.config(z.locales.es());
import { LISTA_ESTADOS } from '../../domain/horas.js';
import { TIPOS_NOVEDAD, formasPermitidas } from '../../domain/liquidacion/index.js';

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD.');
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usa el formato HH:MM (24 horas).');
const texto = (max = 120) => z.string().trim().max(max);
const opcional = (s) => s.optional().nullable().or(z.literal('').transform(() => null));
const dinero = z.coerce.number().min(0).max(1_000_000_000);
const bandera = z.union([z.boolean(), z.coerce.number().int().min(0).max(1)]).transform((v) => (v ? 1 : 0));

export const id = z.object({ id: z.coerce.number().int().positive() });

export const login = z.object({ email: z.string().trim().email().max(120), password: z.string().min(1).max(200) });
export const password = z.object({
  actual: z.string().min(1).max(200),
  nueva: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres.').max(200)
    .regex(/[A-Za-z]/, 'Incluye al menos una letra.').regex(/\d/, 'Incluye al menos un número.'),
});
export const usuario = z.object({
  email: z.string().trim().email().max(120),
  nombre: texto(80).min(2),
  password: password.shape.nueva,
  rol: z.enum(['admin', 'consulta']),
});

export const empresa = z.object({ razon_social: texto(120).min(2), nit: texto(30), ciudad: texto(60) });
export const sede = z.object({ nombre: texto(80).min(2), direccion: opcional(texto(120)), ciudad: opcional(texto(60)) });

export const colaborador = z.object({
  documento: z.string().trim().regex(/^[0-9A-Za-z.-]{4,20}$/, 'Documento no válido.'),
  nombre: texto(120).min(3),
  cargo: opcional(texto(80)),
  sede_id: opcional(z.coerce.number().int().positive()),
  tipo_vinculo: z.enum(['salario', 'integral', 'jornal', 'servicios']),
  salario_base: dinero.default(0),
  valor_dia: dinero.default(0),
  fecha_ingreso: opcional(fecha),
  fecha_retiro: opcional(fecha),
  nivel_arl: z.coerce.number().int().min(1).max(5).default(1),
  eps: opcional(texto(60)),
  afp: opcional(texto(60)),
  estudia: bandera.default(0),
  tipo_horario: z.enum(['extendido', 'rotativo']).default('extendido'),
  dia_descanso: opcional(z.coerce.number().int().min(0).max(6)),
  entrada: hora, salida: hora, entrada_dom: hora, salida_dom: hora,
  descanso_min: z.coerce.number().int().min(0).max(240).default(30),
  forma_pago: z.enum(['diaria', 'semanal', 'quincenal', 'mensual']),
  tipo_contrato: z.enum(['indefinido', 'fijo', 'obra']).default('indefinido'),
  fecha_fin_contrato: opcional(fecha),
  dias_vacaciones_tomadas: z.coerce.number().min(0).max(1000).default(0),
  dependientes: bandera.default(0),
  intereses_vivienda: dinero.default(0),
  medicina_prepagada: dinero.default(0),
  activo: bandera.default(1),
}).refine((c) => !['salario', 'integral'].includes(c.tipo_vinculo) || c.salario_base > 0, { message: 'Indica el salario base.', path: ['salario_base'] })
  .refine((c) => !['jornal', 'servicios'].includes(c.tipo_vinculo) || c.valor_dia > 0, { message: 'Indica el valor del día.', path: ['valor_dia'] })
  // art. 134 CST: jornal máximo cada semana, sueldo máximo cada mes
  .refine((c) => formasPermitidas(c.tipo_vinculo).includes(c.forma_pago), { message: 'Esa forma de pago no se permite para este tipo de contrato.', path: ['forma_pago'] })
  .refine((c) => !c.fecha_retiro || !c.fecha_ingreso || c.fecha_retiro >= c.fecha_ingreso, { message: 'El retiro no puede ser antes del ingreso.', path: ['fecha_retiro'] });

const tasa = z.coerce.number().min(0).max(5);
export const parametros = z.object({
  vigente_desde: fecha,
  nombre: opcional(texto(120)),
  valores: z.object({
    smmlv: dinero, auxilio_transporte: dinero, uvt: dinero,
    tope_aux_transporte_smmlv: z.coerce.number().min(0).max(10),
    jornada_semanal: z.coerce.number().min(1).max(60),
    factor_horas_mes: z.coerce.number().min(1).max(6),
    hora_inicio_nocturna: hora, hora_fin_nocturna: hora,
    recargo_nocturno: tasa, recargo_extra_diurna: tasa, recargo_extra_nocturna: tasa, recargo_dominical: tasa,
    dominical_incluye_base: z.boolean(),
    salud_empleado: tasa, pension_empleado: tasa, salud_empleador: tasa, pension_empleador: tasa,
    caja_compensacion: tasa, icbf: tasa, sena: tasa,
    arl: z.record(z.enum(['1', '2', '3', '4', '5']), tasa),
    fsp: z.array(z.object({ desde: z.coerce.number().min(0), tasa })).max(10),
    prima: tasa, cesantias: tasa, intereses_cesantias_anual: tasa, vacaciones: tasa,
    incapacidad_porcentaje: tasa,
    exonerado_114_1: z.boolean(), retencion_activa: z.boolean(),
    renta_exenta_porcentaje: tasa, renta_exenta_tope_uvt_anual: z.coerce.number().min(0).max(100000),
  }).partial(),
});

export const festivo = z.object({ fecha, nombre: texto(80).min(2) });
export const anio = z.object({ anio: z.coerce.number().int().min(2000).max(2100) });
export const mesAnio = anio.extend({ mes: z.coerce.number().int().min(1).max(12) });
export const periodo = mesAnio.extend({ quincena: z.coerce.number().int().refine((q) => q === 1 || q === 2, 'La quincena es 1 o 2.') });

const registro = z.object({
  colaborador_id: z.coerce.number().int().positive(),
  fecha,
  estado: z.enum(LISTA_ESTADOS),
  entrada: opcional(hora), salida: opcional(hora),
  descanso_min: z.coerce.number().int().min(0).max(240).default(0),
  observacion: opcional(texto(200)),
});
export const registros = z.array(registro).min(1).max(2000);
export const consultaFecha = z.object({ fecha });
export const consultaPagos = z.object({ fecha, modo: z.enum(['dia', 'semana']).default('dia') });
export const terminacion = z.object({
  fecha_retiro: fecha,
  motivo: z.enum(['renuncia', 'justa_causa', 'sin_justa_causa', 'mutuo_acuerdo', 'fin_contrato']),
  promedio_variable: z.coerce.number().min(0).max(1_000_000_000).optional(),
  dias_vacaciones_tomadas: z.coerce.number().min(0).max(1000).optional(),
});
export const rangoAsistencia = z.object({
  colaborador_id: z.coerce.number().int().positive(),
  estado: z.enum(LISTA_ESTADOS.filter((e) => e !== 'OK')),
  desde: fecha, hasta: fecha,
  observacion: opcional(texto(200)),
});
export const generar = z.object({ sobrescribir: z.boolean().default(false) });

export const novedad = z.object({
  colaborador_id: z.coerce.number().int().positive(),
  tipo: z.enum(Object.keys(TIPOS_NOVEDAD)),
  valor: dinero.refine((v) => v > 0, 'El valor debe ser mayor a cero.'),
  descripcion: opcional(texto(160)),
});
