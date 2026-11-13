import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/index.js';
import { useCarga } from '../../hooks/useCarga.js';
import { usePeriodo } from '../../context/Periodo.jsx';
import { useAuth } from '../../context/Auth.jsx';
import { useAvisos } from '../../context/Avisos.jsx';
import { Boton, Cargando, Confirmar, Encabezado, ErrorCarga, Etiqueta, Panel, Vacio } from '../../components/ui.jsx';
import { cop, descargarCsv, nombrePeriodo, num } from '../../lib/formato.js';
import { Desprendible } from './Desprendible.jsx';
import { Novedades } from './Novedades.jsx';
import { PagosDiarios } from './PagosDiarios.jsx';

import { FORMAS as FORMA, TIPOS } from '../../lib/formato.js';

export function Nomina() {
  const { actual, refrescarActual } = usePeriodo();
  const { esAdmin } = useAuth();
  const avisar = useAvisos();
  const datos = useCarga(() => (actual
    ? Promise.all([api.periodos.nomina(actual.id), api.periodos.novedades(actual.id), api.catalogos(), api.empresa.obtener()])
    : Promise.resolve(null)), [actual?.id, actual?.estado]);
  const [detalle, setDetalle] = useState(null);
  const [imprimir, setImprimir] = useState(null);
  const [accion, setAccion] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  if (datos.error) return <ErrorCarga error={datos.error} reintentar={datos.recargar} />;
  if (!actual || !datos.datos || datos.datos[0].periodo.id !== actual.id) return <Cargando filas={8} />;
  const [nomina, novedades, catalogos, empresa] = datos.datos;
  const { filas, totales } = nomina;
  const cerrada = actual.estado === 'liquidado';

  const ejecutar = async () => {
    setTrabajando(true);
    try {
      if (accion === 'liquidar') { await api.periodos.liquidar(actual.id); avisar('Quincena liquidada.'); }
      else { await api.periodos.reabrir(actual.id); avisar('Quincena reabierta.'); }
      setAccion(null);
      await refrescarActual();
    } catch (e) { avisar(e.message, 'error'); } finally { setTrabajando(false); }
  };

  const exportar = () => {
    const cab = ['Documento', 'Colaborador', 'Sede', 'Vinculación', 'Forma de pago', 'Días pagados', 'H. extra diurnas', 'H. extra nocturnas', 'H. dominicales', 'Salario', 'Auxilio', 'Extras y recargos', 'IBC', 'Total devengado', 'Total deducciones', 'Neto', 'Ya pagado', 'A pagar al cierre'];
    const cuerpo = filas.map((f) => [f.documento, f.nombre, f.sede || '', f.tipo_vinculo, FORMA[f.forma_pago], f.dias.pagados, f.horas.hed, f.horas.hen, f.horas.hdd + f.horas.hdn, f.sueldo, f.auxilio, f.extras, f.ibc, f.total_devengado, f.total_deducciones, f.neto, f.ya_pagado, f.a_pagar]);
    descargarCsv(`nomina-${actual.anio}-${String(actual.mes).padStart(2, '0')}-q${actual.quincena}.csv`, [cab, ...cuerpo]);
  };

  const imprimirLista = (lista) => {
    setImprimir(lista);
    setTimeout(() => { window.print(); setImprimir(null); }, 80);
  };

  return (
    <div className="pagina">
      <Encabezado titulo="Nómina quincenal" descripcion={nombrePeriodo(actual)}>
        <Boton icono="descargar" onClick={exportar} disabled={!filas.length}>Exportar CSV</Boton>
        <Boton icono="imprimir" onClick={() => imprimirLista(filas)} disabled={!filas.length}>Imprimir desprendibles</Boton>
        {esAdmin && (cerrada
          ? <Boton icono="abrir" onClick={() => setAccion('reabrir')}>Reabrir quincena</Boton>
          : <Boton variante="primario" icono="candado" onClick={() => setAccion('liquidar')} disabled={!filas.length}>Liquidar quincena</Boton>)}
      </Encabezado>

      <section className="totales-banda">
        <div><span>Personas</span><strong>{filas.length}</strong></div>
        <div><span>Devengado</span><strong>{cop(totales.devengado)}</strong></div>
        <div><span>Deducciones</span><strong className="texto-rojo">{cop(totales.deducciones)}</strong></div>
        <div><span>Neto de la quincena</span><strong>{cop(totales.neto)}</strong></div>
        <div className="totales-banda__neto"><span>A pagar al cierre</span><strong>{cop(totales.a_pagar)}</strong></div>
        <Etiqueta tono={cerrada ? 'acento' : 'ambar'}>{cerrada ? 'Liquidada' : 'Sin liquidar'}</Etiqueta>
      </section>

      {filas.length === 0 ? <Vacio titulo="No hay nadie para liquidar" texto="Agrega colaboradores o revisa sus fechas de ingreso." /> : (
        <div className="tabla-contenedor">
          <table className="tabla tabla--clic">
            <thead><tr><th>Colaborador</th><th className="num">Días</th><th className="num">Extra</th><th className="num">Dom./fest.</th><th className="num">Devengado</th><th className="num">Deducciones</th><th className="num">Neto</th><th className="num">A pagar</th></tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.colaborador_id} onClick={() => setDetalle(f)} tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setDetalle(f))}>
                  <td>
                    <div className="persona persona--compacta">
                      <div><strong>{f.nombre}</strong><span>{f.sede || 'Sin sede'}{f.tipo_vinculo !== 'salario' ? `, ${TIPOS[f.tipo_vinculo].toLowerCase()}` : ''}</span></div>
                      {f.alertas?.length > 0 && <span className="punto-alerta" title={f.alertas.join(' ')} aria-label={f.alertas.join(' ')} />}
                    </div>
                  </td>
                  <td className="num">{f.dias.pagados}</td>
                  <td className="num">{num(f.horas.hed + f.horas.hen)} h</td>
                  <td className="num">{num(f.horas.hdd + f.horas.hdn)} h</td>
                  <td className="num">{cop(f.total_devengado)}</td>
                  <td className="num texto-rojo">{cop(f.total_deducciones)}</td>
                  <td className="num">{cop(f.neto)}</td>
                  <td className="num">
                    <strong className={f.a_pagar < 0 ? 'texto-rojo' : ''}>{cop(f.a_pagar)}</strong>
                    <span className="sub">{FORMA[f.forma_pago]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PagosDiarios periodo={actual} />

      <Novedades periodo={actual} novedades={novedades} colaboradores={filas} tipos={catalogos.tipos_novedad} editable={esAdmin && !cerrada} alCambiar={datos.recargar} />

      <Panel abierto={Boolean(detalle)} ancho="ancho" titulo="Desprendible de pago" subtitulo={detalle?.nombre} alCerrar={() => setDetalle(null)}
        pie={<><Boton onClick={() => setDetalle(null)}>Cerrar</Boton><Boton variante="primario" icono="imprimir" onClick={() => imprimirLista([detalle])}>Imprimir</Boton></>}>
        {detalle && (
          <>
            {detalle.alertas?.length > 0 && <ul className="alerta alerta--ambar">{detalle.alertas.map((a) => <li key={a}>{a}</li>)}</ul>}
            <Desprendible fila={detalle} periodo={actual} empresa={empresa} />
          </>
        )}
      </Panel>
      <Confirmar abierto={accion === 'liquidar'} titulo="¿Liquidar la quincena?" texto={`Se guardan los valores de ${filas.length} personas; al cierre se pagan ${cop(totales.a_pagar)}. Después no cambian aunque edites asistencia, salarios o parámetros, salvo que la reabras.`} accion="Liquidar quincena" cargando={trabajando} alConfirmar={ejecutar} alCerrar={() => setAccion(null)} />
      <Confirmar abierto={accion === 'reabrir'} peligro titulo="¿Reabrir la quincena?" texto="Se borra la liquidación guardada y los valores se vuelven a calcular con los datos actuales." accion="Reabrir quincena" cargando={trabajando} alConfirmar={ejecutar} alCerrar={() => setAccion(null)} />

      {imprimir && createPortal(
        <div className="solo-impresion">{imprimir.map((f) => <Desprendible key={f.colaborador_id} fila={f} periodo={actual} empresa={empresa} />)}</div>,
        document.body,
      )}
    </div>
  );
}
