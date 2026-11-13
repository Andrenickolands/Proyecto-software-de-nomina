// Valores legales de Colombia. Cada versión rige desde una fecha.
// 2026: mínimo 1.750.905 (Dec. 1469/2025), auxilio 249.095 (Dec. 1470/2025), UVT 52.374.
// Ley 2466/2025: nocturno desde las 7 p. m., dominical 80 % -> 90 % (jul-2026) -> 100 % (jul-2027).
// Ley 2101/2021: jornada de 44 h hasta el 14-jul-2026 y 42 h desde el 15.

export const PARAMETROS_BASE = {
  smmlv: 1750905,
  auxilio_transporte: 249095,
  uvt: 52374,
  tope_aux_transporte_smmlv: 2,
  jornada_semanal: 44,
  // horas al mes = jornada x 5 (42 h -> 210 h)
  factor_horas_mes: 5,
  hora_inicio_nocturna: '19:00',
  hora_fin_nocturna: '06:00',
  recargo_nocturno: 0.35,
  recargo_extra_diurna: 0.25,
  recargo_extra_nocturna: 0.75,
  recargo_dominical: 0.8,
  // true = se paga la hora completa + recargo (como en el Excel), false = solo el recargo
  dominical_incluye_base: true,
  salud_empleado: 0.04,
  pension_empleado: 0.04,
  salud_empleador: 0.085,
  pension_empleador: 0.12,
  caja_compensacion: 0.04,
  icbf: 0.03,
  sena: 0.02,
  arl: { 1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.0435, 5: 0.0696 },
  // FSP según cuántos mínimos gana
  fsp: [
    { desde: 4, tasa: 0.01 },
    { desde: 16, tasa: 0.012 },
    { desde: 17, tasa: 0.014 },
    { desde: 18, tasa: 0.016 },
    { desde: 19, tasa: 0.018 },
    { desde: 20, tasa: 0.02 },
  ],
  prima: 0.0833,
  cesantias: 0.0833,
  intereses_cesantias_anual: 0.12,
  vacaciones: 0.0417,
  incapacidad_porcentaje: 0.6667,
  tope_ibc_smmlv: 25, // el IBC no puede pasar de 25 mínimos
  limite_no_salarial: 0.4, // Ley 1393: lo no salarial que pase del 40 % entra al IBC
  extras_max_dia: 2, // máximo de horas extra (art. 167-A CST)
  extras_max_semana: 12,
  salario_integral_min_smmlv: 13, // 10 mínimos + 30 % de factor prestacional
  factor_ibc_integral: 0.7,
  exonerado_114_1: true, // no paga salud, SENA ni ICBF por quienes ganan menos de 10 mínimos
  retencion_activa: true,
  renta_exenta_porcentaje: 0.25,
  renta_exenta_tope_uvt_anual: 790,
  // deducciones de la base de retención (art. 387 E.T.)
  dependientes_porcentaje: 0.1,
  dependientes_tope_uvt: 32,
  vivienda_tope_uvt: 100,
  medicina_tope_uvt: 16,
  limite_beneficios_retencion: 0.4, // deducciones + exentas no pueden pasar del 40 %
  // liquidación de contrato
  intereses_cesantias_tasa: 0.12,
};

export const VERSIONES_SEMILLA = [
  { vigente_desde: '2026-01-01', nombre: 'Año 2026 (SMMLV y UVT 2026)', valores: { ...PARAMETROS_BASE } },
  { vigente_desde: '2026-07-01', nombre: 'Recargo dominical 90 %', valores: { ...PARAMETROS_BASE, recargo_dominical: 0.9 } },
  { vigente_desde: '2026-07-15', nombre: 'Jornada de 42 horas', valores: { ...PARAMETROS_BASE, recargo_dominical: 0.9, jornada_semanal: 42 } },
];

// Tabla de retención del art. 383 (en UVT)
export const TABLA_RETENCION = [
  { desde: 0, hasta: 95, tasa: 0, base: 0 },
  { desde: 95, hasta: 150, tasa: 0.19, base: 0 },
  { desde: 150, hasta: 360, tasa: 0.28, base: 10 },
  { desde: 360, hasta: 640, tasa: 0.33, base: 69 },
  { desde: 640, hasta: 945, tasa: 0.35, base: 162 },
  { desde: 945, hasta: 2300, tasa: 0.37, base: 268 },
  { desde: 2300, hasta: Infinity, tasa: 0.39, base: 770 },
];

// devuelve una función que, dada una fecha, da los valores que regían ese día
export function selectorParametros(versiones) {
  const ordenadas = [...versiones].sort((a, b) => a.vigente_desde.localeCompare(b.vigente_desde));
  return (fecha) => {
    let actual = null;
    for (const v of ordenadas) if (v.vigente_desde <= fecha) actual = v;
    if (!actual) actual = ordenadas[0];
    return { ...PARAMETROS_BASE, ...(actual ? actual.valores : {}) };
  };
}
