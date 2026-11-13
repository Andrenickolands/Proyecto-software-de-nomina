import { useEffect, useId, useRef, useState } from 'react';
import { Icono } from './Icono.jsx';

export function Boton({ variante = 'secundario', icono, children, cargando, className = '', ...props }) {
  return (
    <button className={`btn btn--${variante} ${className}`} disabled={cargando || props.disabled} {...props}>
      {icono && <Icono nombre={icono} tam={16} />}
      {children && <span>{cargando ? 'Un momento…' : children}</span>}
    </button>
  );
}

export function BotonIcono({ icono, etiqueta, ...props }) {
  return (
    <button className="btn-icono" aria-label={etiqueta} title={etiqueta} {...props}>
      <Icono nombre={icono} tam={17} />
    </button>
  );
}

// Input de contraseña con botón para mostrarla u ocultarla
export function InputClave({ id, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="clave">
      <input id={id} type={visible ? 'text' : 'password'} {...props} />
      <button type="button" className="clave__ver" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        <Icono nombre={visible ? 'ojoTachado' : 'ojo'} tam={18} />
      </button>
    </div>
  );
}

export function Campo({ etiqueta, ayuda, error, children, ancho }) {
  const id = useId();
  const hijo = typeof children === 'function' ? children(id) : children;
  return (
    <div className={`campo ${ancho ? `campo--${ancho}` : ''} ${error ? 'campo--error' : ''}`}>
      <label htmlFor={id}>{etiqueta}</label>
      {hijo}
      {error ? <p className="campo__error">{error}</p> : ayuda && <p className="campo__ayuda">{ayuda}</p>}
    </div>
  );
}

export function Panel({ abierto, titulo, subtitulo, alCerrar, children, pie, ancho = 'normal' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return undefined;
    const previo = document.activeElement;
    const tecla = (e) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', tecla);
    ref.current?.querySelector('input, select, textarea, button')?.focus();
    return () => { document.removeEventListener('keydown', tecla); previo?.focus?.(); };
  }, [abierto, alCerrar]);
  if (!abierto) return null;
  return (
    <div className="panel-fondo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <aside className={`panel panel--${ancho}`} role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <header className="panel__cabeza">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={alCerrar} />
        </header>
        <div className="panel__cuerpo">{children}</div>
        {pie && <footer className="panel__pie">{pie}</footer>}
      </aside>
    </div>
  );
}

export function Confirmar({ abierto, titulo, texto, accion, peligro, alConfirmar, alCerrar, cargando }) {
  if (!abierto) return null;
  return (
    <div className="panel-fondo panel-fondo--centro" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="dialogo" role="alertdialog" aria-modal="true" aria-label={titulo}>
        <h2>{titulo}</h2>
        <p>{texto}</p>
        <div className="dialogo__acciones">
          <Boton onClick={alCerrar} autoFocus>Cancelar</Boton>
          <Boton variante={peligro ? 'peligro' : 'primario'} onClick={alConfirmar} cargando={cargando}>{accion}</Boton>
        </div>
      </div>
    </div>
  );
}

export function Vacio({ titulo, texto, children }) {
  return (
    <div className="vacio">
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

export function Cargando({ filas = 4 }) {
  return (
    <div className="esqueleto" aria-label="Cargando">
      {Array.from({ length: filas }).map((_, i) => <div key={i} className="esqueleto__fila" style={{ width: `${92 - i * 9}%` }} />)}
    </div>
  );
}

export function ErrorCarga({ error, reintentar }) {
  return (
    <div className="error-carga" role="alert">
      <Icono nombre="alerta" />
      <p>{error?.message || 'No se pudo cargar la información.'}</p>
      {reintentar && <Boton onClick={reintentar}>Reintentar</Boton>}
    </div>
  );
}

export const Etiqueta = ({ tono = 'neutro', children }) => <span className={`etiqueta etiqueta--${tono}`}>{children}</span>;

export function Encabezado({ titulo, descripcion, children }) {
  return (
    <header className="encabezado">
      <div>
        <h1>{titulo}</h1>
        {descripcion && <p>{descripcion}</p>}
      </div>
      {children && <div className="encabezado__acciones">{children}</div>}
    </header>
  );
}
