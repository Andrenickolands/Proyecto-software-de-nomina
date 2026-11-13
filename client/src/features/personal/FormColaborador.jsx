import { Campo } from '../../components/ui.jsx';
import { DIAS, FORMAS, FORMAS_POR_TIPO, usaValorDia } from '../../lib/formato.js';

export const COLAB_VACIO = {
  documento: '', nombre: '', cargo: '', sede_id: '', tipo_vinculo: 'salario', salario_base: '', valor_dia: '',
  fecha_ingreso: '', fecha_retiro: '', nivel_arl: 1, eps: '', afp: '', estudia: 0, tipo_horario: 'extendido',
  dia_descanso: '', entrada: '09:00', salida: '18:00', entrada_dom: '10:00', salida_dom: '16:00', descanso_min: 30, forma_pago: 'quincenal', tipo_contrato: 'indefinido', fecha_fin_contrato: '',
  dias_vacaciones_tomadas: 0, dependientes: 0, intereses_vivienda: 0, medicina_prepagada: 0, activo: 1,
};

const AYUDA_PAGO = {
  diaria: 'Se le paga cada día que trabaja. Al cerrar la quincena queda solo el saldo de descuentos y novedades.',
  semanal: 'Se le paga cada semana lo trabajado. Al cerrar la quincena van los días sueltos y el saldo.',
  quincenal: 'Se le paga al cerrar cada quincena.',
  mensual: 'No se le paga en la primera quincena; en la segunda recibe todo el mes.',
};
const AYUDA_TIPO = {
  salario: 'Contrato laboral con sueldo mensual.',
  integral: 'Sueldo de 13 mínimos o más que ya incluye prima y cesantías. Aportes sobre el 70 %.',
  jornal: 'Contrato laboral pagado por día. Tiene auxilio, recargos, seguridad social y prestaciones. Por ley se paga máximo cada semana.',
  servicios: 'Contratista independiente: paga su propia seguridad social y no tiene prestaciones.',
};

export function FormColaborador({ valor, sedes, errores = {}, onChange, smmlv }) {
  const [v, setV] = [valor, onChange];
  const set = (k) => (e) => {
    const valor = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value;
    const nuevo = { ...v, [k]: valor };
    // al cambiar el tipo de contrato, la forma de pago tiene que ser una permitida
    if (k === 'tipo_vinculo' && !FORMAS_POR_TIPO[valor].includes(v.forma_pago)) nuevo.forma_pago = FORMAS_POR_TIPO[valor][0];
    setV(nuevo);
  };
  const porDia = usaValorDia(v.tipo_vinculo);
  return (
    <div className="form">
      <fieldset>
        <legend>Datos personales</legend>
        <div className="form__fila">
          <Campo etiqueta="Nombre completo" error={errores.nombre} ancho="2">{(id) => <input id={id} value={v.nombre} onChange={set('nombre')} />}</Campo>
          <Campo etiqueta="Documento" error={errores.documento}>{(id) => <input id={id} inputMode="numeric" value={v.documento} onChange={set('documento')} />}</Campo>
        </div>
        <div className="form__fila">
          <Campo etiqueta="Cargo" error={errores.cargo}>{(id) => <input id={id} value={v.cargo || ''} onChange={set('cargo')} />}</Campo>
          <Campo etiqueta="Sede">{(id) => (
            <select id={id} value={v.sede_id || ''} onChange={set('sede_id')}>
              <option value="">Sin sede</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}</Campo>
        </div>
        <label className="casilla"><input type="checkbox" checked={Boolean(Number(v.estudia))} onChange={set('estudia')} /> Estudia (horario rotativo flexible)</label>
      </fieldset>

      <fieldset>
        <legend>Contrato</legend>
        <div className="segmentado" role="radiogroup" aria-label="Tipo de vinculación">
          {[['salario', 'Salario'], ['integral', 'Salario integral'], ['jornal', 'Jornal por día'], ['servicios', 'Prestación de servicios']].map(([k, t]) => (
            <label key={k} className={v.tipo_vinculo === k ? 'activo' : ''}>
              <input type="radio" name="tipo_vinculo" value={k} checked={v.tipo_vinculo === k} onChange={set('tipo_vinculo')} />{t}
            </label>
          ))}
        </div>
        <p className="campo__ayuda">{AYUDA_TIPO[v.tipo_vinculo]}</p>
        <div className="form__fila">
          {porDia ? (
            <Campo etiqueta="Valor del día" error={errores.valor_dia}>{(id) => <input id={id} type="number" min="0" step="1000" value={v.valor_dia} onChange={set('valor_dia')} />}</Campo>
          ) : (
            <Campo etiqueta="Salario base mensual" error={errores.salario_base} ayuda={smmlv && Number(v.salario_base) > 0 && Number(v.salario_base) < smmlv ? 'Está por debajo del salario mínimo.' : 'Sin auxilio de transporte.'}>
              {(id) => <input id={id} type="number" min="0" step="1000" value={v.salario_base} onChange={set('salario_base')} />}
            </Campo>
          )}
          <Campo etiqueta="Nivel de riesgo ARL">{(id) => (
            <select id={id} value={v.nivel_arl} onChange={set('nivel_arl')}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Riesgo {n}</option>)}
            </select>
          )}</Campo>
        </div>
        <Campo etiqueta="Forma de pago" error={errores.forma_pago} ayuda={AYUDA_PAGO[v.forma_pago]}>{(id) => (
          <select id={id} value={v.forma_pago} onChange={set('forma_pago')}>
            {FORMAS_POR_TIPO[v.tipo_vinculo].map((f) => <option key={f} value={f}>{FORMAS[f]}</option>)}
          </select>
        )}</Campo>
        {v.tipo_vinculo !== 'servicios' && (
          <div className="form__fila">
            <Campo etiqueta="Duración del contrato">{(id) => (
              <select id={id} value={v.tipo_contrato || 'indefinido'} onChange={set('tipo_contrato')}>
                <option value="indefinido">Término indefinido</option>
                <option value="fijo">Término fijo</option>
                <option value="obra">Obra o labor</option>
              </select>
            )}</Campo>
            {v.tipo_contrato !== 'indefinido' && (
              <Campo etiqueta="Termina el" error={errores.fecha_fin_contrato} ayuda="Se usa si hay que indemnizar.">{(id) => <input id={id} type="date" value={v.fecha_fin_contrato || ''} onChange={set('fecha_fin_contrato')} />}</Campo>
            )}
          </div>
        )}
        <div className="form__fila">
          <Campo etiqueta="Fecha de ingreso" error={errores.fecha_ingreso}>{(id) => <input id={id} type="date" value={v.fecha_ingreso || ''} onChange={set('fecha_ingreso')} />}</Campo>
          <Campo etiqueta="Fecha de retiro" error={errores.fecha_retiro} ayuda="Déjala vacía si sigue vinculado.">{(id) => <input id={id} type="date" value={v.fecha_retiro || ''} onChange={set('fecha_retiro')} />}</Campo>
        </div>
        <div className="form__fila">
          <Campo etiqueta="EPS">{(id) => <input id={id} value={v.eps || ''} onChange={set('eps')} />}</Campo>
          <Campo etiqueta="Fondo de pensiones">{(id) => <input id={id} value={v.afp || ''} onChange={set('afp')} />}</Campo>
        </div>
        {v.tipo_vinculo !== 'servicios' && (
          <Campo etiqueta="Días de vacaciones ya tomados" ayuda="Desde que entró. Se usa para la liquidación del contrato.">{(id) => <input id={id} type="number" min="0" step="0.5" value={v.dias_vacaciones_tomadas ?? 0} onChange={set('dias_vacaciones_tomadas')} />}</Campo>
        )}
        <label className="casilla"><input type="checkbox" checked={Boolean(Number(v.activo))} onChange={set('activo')} /> Activo</label>
      </fieldset>

      {(v.tipo_vinculo === 'salario' || v.tipo_vinculo === 'integral') && (
        <fieldset>
          <legend>Para la retención en la fuente</legend>
          <p className="texto-suave">Solo importa si gana lo suficiente para que le apliquen retención. Hay que pedirle los soportes.</p>
          <label className="casilla"><input type="checkbox" checked={Boolean(Number(v.dependientes))} onChange={set('dependientes')} /> Tiene personas a cargo (hijos, cónyuge o padres que dependan de él)</label>
          <div className="form__fila">
            <Campo etiqueta="Intereses de vivienda al mes">{(id) => <input id={id} type="number" min="0" step="1000" value={v.intereses_vivienda ?? 0} onChange={set('intereses_vivienda')} />}</Campo>
            <Campo etiqueta="Medicina prepagada al mes">{(id) => <input id={id} type="number" min="0" step="1000" value={v.medicina_prepagada ?? 0} onChange={set('medicina_prepagada')} />}</Campo>
          </div>
        </fieldset>
      )}

      <fieldset>
          <legend>Horario base</legend>
          <p className="texto-suave">Con este horario se llena la asistencia de cada quincena. Luego puedes ajustar día por día.</p>
          <div className="form__fila">
            <Campo etiqueta="Tipo de horario">{(id) => (
              <select id={id} value={v.tipo_horario} onChange={set('tipo_horario')}>
                <option value="extendido">Extendido</option>
                <option value="rotativo">Rotativo</option>
              </select>
            )}</Campo>
            <Campo etiqueta="Día de descanso">{(id) => (
              <select id={id} value={v.dia_descanso ?? ''} onChange={set('dia_descanso')}>
                <option value="">Sin descanso fijo</option>
                {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            )}</Campo>
          </div>
          <div className="form__fila form__fila--4">
            <Campo etiqueta="Entrada" error={errores.entrada}>{(id) => <input id={id} type="time" value={v.entrada} onChange={set('entrada')} />}</Campo>
            <Campo etiqueta="Salida" error={errores.salida}>{(id) => <input id={id} type="time" value={v.salida} onChange={set('salida')} />}</Campo>
            <Campo etiqueta="Almuerzo (min)">{(id) => <input id={id} type="number" min="0" max="240" step="5" value={v.descanso_min} onChange={set('descanso_min')} />}</Campo>
          </div>
          <div className="form__fila form__fila--4">
            <Campo etiqueta="Entrada domingo y festivo" error={errores.entrada_dom}>{(id) => <input id={id} type="time" value={v.entrada_dom} onChange={set('entrada_dom')} />}</Campo>
            <Campo etiqueta="Salida domingo y festivo" error={errores.salida_dom}>{(id) => <input id={id} type="time" value={v.salida_dom} onChange={set('salida_dom')} />}</Campo>
          </div>
        </fieldset>
    </div>
  );
}
