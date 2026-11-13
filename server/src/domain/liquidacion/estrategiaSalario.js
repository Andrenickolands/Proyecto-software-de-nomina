// Liquidación para quien gana sueldo: salario ordinario o salario integral.
import { clasificarHoras, ESTADOS } from '../horas.js';
import { diasComerciales } from '../fechas.js';
import { esDevengo, esDeduccion, aConcepto } from './novedades.js';
import { tasaFsp, retencionMensual, aportesEmpleador, provisionPrestaciones, sumar, redondear } from './aportes.js';
import { ventanaLaboral, conteoDias, totalizar, alertasExtras } from './resumen.js';

const ETIQUETAS_HORAS = Object.freeze({
  hed: 'Horas extra diurnas',
  hen: 'Horas extra nocturnas',
  hon: 'Recargo nocturno',
  hdd: 'Dominicales y festivos diurnos',
  hdn: 'Dominicales y festivos nocturnos',
});

const factoresHora = (p) => {
  const base = p.dominical_incluye_base ? 1 : 0;
  return {
    hed: 1 + p.recargo_extra_diurna,
    hen: 1 + p.recargo_extra_nocturna,
    hon: p.recargo_nocturno,
    hdd: base + p.recargo_dominical,
    hdn: base + p.recargo_dominical + p.recargo_nocturno,
  };
};

export const valorHora = (salario, p) => salario / (p.jornada_semanal * p.factor_horas_mes);

// se valora día por día porque el recargo puede cambiar a mitad de quincena
export function valorarHoras(dias, valorBase, getParams, porHora = false) {
  const acum = Object.fromEntries(Object.keys(ETIQUETAS_HORAS).map((k) => [k, { horas: 0, valor: 0 }]));
  for (const d of dias) {
    const pd = getParams(d.fecha);
    // jornal: el valor del día / horas diarias de la jornada (jornada semanal / 6)
    const vh = porHora ? valorBase / (pd.jornada_semanal / 6) : valorHora(valorBase, pd);
    const f = factoresHora(pd);
    for (const k of Object.keys(acum)) {
      const h = d[k] / 60;
      acum[k].horas += h;
      acum[k].valor += h * vh * f[k];
    }
  }
  return Object.entries(acum)
    .filter(([, a]) => a.horas > 0)
    .map(([codigo, a]) => ({ concepto: ETIQUETAS_HORAS[codigo], codigo, cantidad: Math.round(a.horas * 100) / 100, unidad: 'horas', valor: redondear(a.valor) }));
}

// IBC con piso (un mínimo proporcional), techo (25 mínimos) y regla del 40 % (Ley 1393 de 2010)
export function calcularIbc({ salarial, noSalarial, dias, factor = 1 }, p) {
  const total = salarial + noSalarial;
  const excedente = Math.max(0, noSalarial - p.limite_no_salarial * total);
  let ibc = salarial * factor + excedente;
  const piso = (p.smmlv * dias) / 30;
  const techo = (p.tope_ibc_smmlv * p.smmlv * dias) / 30;
  if (dias > 0) ibc = Math.min(Math.max(ibc, piso), techo);
  return { ibc: redondear(ibc), excedente40: redondear(excedente) };
}

function crearEstrategiaSueldo({ tipo, nombre, integral }) {
  return Object.freeze({
    tipo,
    nombre,
    formasPago: ['quincenal', 'mensual'],

    liquidar(colaborador, { periodo, registros, festivos, getParams, novedades = [], anterior = null }) {
      const p = getParams(periodo.hasta);
      const ventana = ventanaLaboral(colaborador, periodo);
      const { cuenta, trabajados, dominicales } = conteoDias(registros, ventana, festivos);
      const horas = clasificarHoras({ registros, festivos, getParams, ...ventana });
      const salario = Number(colaborador.salario_base || 0);

      const diasBase = ventana.desde <= ventana.hasta ? diasComerciales(ventana.desde, ventana.hasta) : 0;
      const noRem = cuenta(ESTADOS.FALTO) + cuenta(ESTADOS.PERMISO_NO_REMUNERADO);
      const incap = cuenta(ESTADOS.INCAPACIDAD);
      const vac = cuenta(ESTADOS.VACACIONES);
      const licMat = cuenta(ESTADOS.LICENCIA_MATERNIDAD);
      const licPat = cuenta(ESTADOS.LICENCIA_PATERNIDAD);
      const diasSueldo = Math.max(0, diasBase - noRem - incap - licMat - licPat);

      const devengos = [];
      const sueldo = redondear((salario * diasSueldo) / 30);
      devengos.push({ concepto: integral ? 'Salario integral' : 'Salario', cantidad: diasSueldo, unidad: 'días', valor: sueldo });

      let incapacidad = 0;
      if (incap > 0) {
        const diaIncap = Math.max((salario / 30) * p.incapacidad_porcentaje, p.smmlv / 30);
        incapacidad = redondear(diaIncap * incap);
        devengos.push({ concepto: 'Incapacidad', cantidad: incap, unidad: 'días', valor: incapacidad });
      }

      // licencias: se pagan con el salario completo y luego la EPS le devuelve a la empresa
      let licencias = 0;
      for (const [dias, nombre] of [[licMat, 'Licencia de maternidad'], [licPat, 'Licencia de paternidad']]) {
        if (!dias) continue;
        const valor = redondear((salario * dias) / 30);
        licencias += valor;
        devengos.push({ concepto: nombre, detalle: 'la reconoce la EPS', cantidad: dias, unidad: 'días', valor });
      }

      let auxilio = 0;
      const diasAux = Math.max(0, diasSueldo - vac);
      if (!integral && salario <= p.tope_aux_transporte_smmlv * p.smmlv && diasAux > 0) {
        auxilio = redondear((p.auxilio_transporte * diasAux) / 30);
        devengos.push({ concepto: 'Auxilio de transporte', cantidad: diasAux, unidad: 'días', valor: auxilio });
      }

      const conceptosHoras = valorarHoras(horas.dias, salario, getParams);
      devengos.push(...conceptosHoras);
      const extras = totalizar(conceptosHoras);

      const novDev = novedades.filter(esDevengo).map(aConcepto);
      devengos.push(...novDev);
      const devSalariales = totalizar(novDev.filter((n) => n.salarial));
      const noSalariales = totalizar(novDev.filter((n) => !n.salarial));

      const { ibc, excedente40 } = calcularIbc({
        salarial: sueldo + incapacidad + licencias + extras + devSalariales,
        noSalarial: noSalariales,
        dias: diasSueldo + incap + licMat + licPat,
        factor: integral ? p.factor_ibc_integral : 1,
      }, p);
      const salud = redondear(ibc * p.salud_empleado);
      const pension = redondear(ibc * p.pension_empleado);
      const deducciones = [
        { concepto: 'Salud', porcentaje: p.salud_empleado, valor: salud },
        { concepto: 'Pensión', porcentaje: p.pension_empleado, valor: pension },
      ];

      const totalDevengado = totalizar(devengos);
      let fsp = 0;
      let retencion = null;
      if (periodo.quincena === 2) {
        // FSP y retención van con el mes completo, por eso solo en la Q2
        const ibcMes = ibc + (anterior?.ibc || 0);
        const tFsp = tasaFsp(ibcMes, p);
        if (tFsp > 0) {
          fsp = redondear(ibcMes * tFsp);
          deducciones.push({ concepto: 'Fondo de solidaridad pensional', porcentaje: tFsp, valor: fsp });
        }
        // en el salario integral también aplica: la DIAN dice que el 30 % prestacional
        // quedó cubierto por la renta exenta general del 25 % (Oficio 8711 de 2019)
        retencion = retencionMensual({
          ingresos: totalDevengado + (anterior?.total_devengado || 0),
          aportes: salud + pension + fsp + (anterior?.aportes_empleado || 0),
          dependientes: Boolean(Number(colaborador.dependientes)),
          vivienda: colaborador.intereses_vivienda,
          medicina: colaborador.medicina_prepagada,
        }, p);
        if (retencion.valor > 0) deducciones.push({ concepto: 'Retención en la fuente', valor: retencion.valor });
      }
      deducciones.push(...novedades.filter(esDeduccion).map(aConcepto));
      const totalDeducciones = totalizar(deducciones);

      const alertas = [];
      if (!integral && salario < p.smmlv) alertas.push('El salario base está por debajo del mínimo legal vigente.');
      if (integral && salario < p.salario_integral_min_smmlv * p.smmlv) alertas.push(`El salario integral debe ser de al menos ${p.salario_integral_min_smmlv} mínimos.`);
      if (noRem > 0) alertas.push(`${noRem} día(s) sin remunerar descontados.`);
      if (licMat + licPat > 0) alertas.push('Hay días de licencia: recuerda hacer el cobro a la EPS.');
      if (excedente40 > 0) alertas.push(`Los pagos no salariales pasan del 40 %: ${excedente40.toLocaleString('es-CO')} entran a la base de aportes.`);
      const horasExtra = horas.totales.hed + horas.totales.hen;
      if (horasExtra > 0) alertas.push(`${horasExtra.toLocaleString('es-CO', { maximumFractionDigits: 2 })} h extra en la quincena.`);
      alertas.push(...alertasExtras(horas.excesos, p));

      return {
        tipo_vinculo: this.tipo,
        salario_base: salario,
        valor_hora: Math.round(valorHora(salario, p) * 100) / 100,
        dias: { base: diasBase, pagados: diasSueldo, trabajados, no_remunerados: noRem, incapacidad: incap, vacaciones: vac, licencias: licMat + licPat, dominicales },
        horas: horas.totales,
        devengos,
        deducciones,
        sueldo, auxilio, incapacidad, licencias, extras, devengos_salariales: devSalariales,
        ibc,
        aportes_empleado: salud + pension + fsp,
        base_prestaciones: sueldo + licencias + extras + devSalariales + auxilio,
        retencion,
        total_devengado: totalDevengado,
        total_deducciones: totalDeducciones,
        neto: totalDevengado - totalDeducciones,
        alertas,
      };
    },

    consolidar(colaborador, liquidaciones, p) {
      const suma = (k) => liquidaciones.reduce((s, l) => s + (Number(l[k]) || 0), 0);
      const salario = Number(colaborador.salario_base || 0);
      const ibc = suma('ibc');
      const nivel = Number(colaborador.nivel_arl || 1);
      const { exonerado, aportes } = aportesEmpleador({ ibc, salario, nivelArl: nivel }, p);
      let prestaciones = provisionPrestaciones({ basePrestaciones: suma('base_prestaciones'), sueldo: suma('sueldo') }, p);
      // en el salario integral la prima y las cesantías ya vienen incluidas; solo quedan vacaciones
      if (integral) prestaciones = { prima: 0, cesantias: 0, intereses_cesantias: 0, vacaciones: prestaciones.vacaciones };
      const devengado = suma('total_devengado');
      return {
        tipo_vinculo: this.tipo, salario_base: salario, nivel_arl: nivel, exonerado,
        ibc, devengado, neto: suma('neto'), base_prestaciones: suma('base_prestaciones'),
        aportes, total_aportes: sumar(aportes),
        prestaciones, total_prestaciones: sumar(prestaciones),
        costo_total: devengado + sumar(aportes) + sumar(prestaciones),
      };
    },
  });
}

export const estrategiaSalario = crearEstrategiaSueldo({ tipo: 'salario', nombre: 'Salario mensual', integral: false });
export const estrategiaIntegral = crearEstrategiaSueldo({ tipo: 'integral', nombre: 'Salario integral', integral: true });
