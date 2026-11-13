// Catálogo de novedades de nómina (devengos y deducciones manuales)
export const TIPOS_NOVEDAD = Object.freeze({
  bonificacion_salarial: { nombre: 'Bonificación salarial', clase: 'devengo', salarial: true },
  comision: { nombre: 'Comisión', clase: 'devengo', salarial: true },
  bonificacion_no_salarial: { nombre: 'Bonificación no salarial', clase: 'devengo', salarial: false },
  otro_devengo: { nombre: 'Otro devengo', clase: 'devengo', salarial: false },
  prestamo: { nombre: 'Préstamo', clase: 'deduccion' },
  avance: { nombre: 'Avance', clase: 'deduccion' },
  vale: { nombre: 'Vale', clase: 'deduccion' },
  libranza: { nombre: 'Libranza', clase: 'deduccion' },
  otra_deduccion: { nombre: 'Otra deducción', clase: 'deduccion' },
});

export const esDevengo = (n) => TIPOS_NOVEDAD[n.tipo]?.clase === 'devengo';
export const esDeduccion = (n) => TIPOS_NOVEDAD[n.tipo]?.clase === 'deduccion';
export const aConcepto = (n) => ({
  concepto: TIPOS_NOVEDAD[n.tipo].nombre,
  detalle: n.descripcion || undefined,
  valor: Math.round(Number(n.valor)),
  salarial: Boolean(TIPOS_NOVEDAD[n.tipo].salarial),
});
