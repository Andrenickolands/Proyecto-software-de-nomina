import { useState } from 'react';
import { api } from '../../api/index.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useAuth } from '../../context/Auth.jsx';
import { useAvisos } from '../../context/Avisos.jsx';
import { Boton, BotonIcono, Cargando, ErrorCarga } from '../../components/ui.jsx';
import { DIAS, diaSemana, fechaCorta } from '../../lib/formato.js';

export function Festivos() {
  const { esAdmin } = useAuth();
  const avisar = useAvisos();
  const [anio, setAnio] = useState(new Date().getFullYear());
  const lista = useCarga(() => api.festivos.listar(anio), [anio]);
  const [nuevo, setNuevo] = useState({ fecha: '', nombre: '' });

  const generar = async () => { try { await api.festivos.generar(anio); avisar(`Festivos de ${anio} cargados.`); lista.recargar(); } catch (e) { avisar(e.message, 'error'); } };
  const agregar = async (e) => {
    e.preventDefault();
    try { await api.festivos.guardar(nuevo); setNuevo({ fecha: '', nombre: '' }); avisar('Festivo guardado.'); lista.recargar(); } catch (er) { avisar(er.message, 'error'); }
  };

  return (
    <section>
      <div className="bloque__cabeza">
        <div className="filtros filtros--sin-margen">
          <select aria-label="Año" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>{[anio - 1, anio, anio + 1, anio + 2].map((a) => <option key={a}>{a}</option>)}</select>
        </div>
        {esAdmin && <Boton icono="chispa" onClick={generar}>Calcular festivos de {anio}</Boton>}
      </div>
      <p className="texto-suave">Se calculan con la Ley Emiliani: los festivos trasladables pasan al lunes y los de Semana Santa dependen de la Pascua.</p>
      {lista.error ? <ErrorCarga error={lista.error} reintentar={lista.recargar} /> : !lista.datos ? <Cargando /> : (
        <ul className="festivos-lista festivos-lista--rejilla">
          {lista.datos.map((f) => (
            <li key={f.fecha}>
              <strong>{fechaCorta(f.fecha)}</strong>
              <span>{f.nombre}, {DIAS[diaSemana(f.fecha)].toLowerCase()}</span>
              {esAdmin && <BotonIcono icono="borrar" etiqueta={`Quitar ${f.nombre}`} onClick={async () => { await api.festivos.eliminar(f.fecha); lista.recargar(); }} />}
            </li>
          ))}
          {lista.datos.length === 0 && <li className="texto-suave">No hay festivos cargados para {anio}.</li>}
        </ul>
      )}
      {esAdmin && (
        <form className="form-linea" onSubmit={agregar}>
          <input type="date" aria-label="Fecha del festivo" required value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} />
          <input aria-label="Nombre del festivo" placeholder="Nombre del día" required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <Boton type="submit" icono="mas">Agregar festivo</Boton>
        </form>
      )}
    </section>
  );
}
