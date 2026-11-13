import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/Auth.jsx';
import { Icono } from './Icono.jsx';
import { SelectorPeriodo } from './SelectorPeriodo.jsx';
import { iniciales } from '../lib/formato.js';

const NAV = [
  { a: '/', texto: 'Resumen', icono: 'resumen', fin: true },
  { a: '/asistencia', texto: 'Asistencia', icono: 'reloj' },
  { a: '/nomina', texto: 'Nómina quincenal', icono: 'nomina' },
  { a: '/consolidado', texto: 'Consolidado del mes', icono: 'mes' },
  { a: '/colaboradores', texto: 'Colaboradores', icono: 'personas' },
  { a: '/sedes', texto: 'Sedes', icono: 'sedes' },
  { a: '/configuracion', texto: 'Configuración', icono: 'ajustes' },
];

export function Marco() {
  const { usuario, salir } = useAuth();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  return (
    <div className={`marco ${menu ? 'marco--menu' : ''}`}>
      <a className="saltar" href="#contenido">Ir al contenido</a>
      <aside className="lateral">
        <div className="lateral__marca">
          <span className="logo" aria-hidden="true">N</span>
          <span>Nómina</span>
          <button className="lateral__cerrar" onClick={() => setMenu(false)} aria-label="Cerrar menú"><Icono nombre="cerrar" /></button>
        </div>
        <SelectorPeriodo />
        <nav className="lateral__nav" aria-label="Principal">
          {NAV.map((n) => (
            <NavLink key={n.a} to={n.a} end={n.fin} onClick={() => setMenu(false)} className={({ isActive }) => `nav-item ${isActive ? 'activo' : ''}`}>
              <Icono nombre={n.icono} />
              <span>{n.texto}</span>
            </NavLink>
          ))}
        </nav>
        <div className="lateral__usuario">
          <span className="avatar" aria-hidden="true">{iniciales(usuario?.nombre)}</span>
          <div>
            <strong>{usuario?.nombre}</strong>
            <span>{usuario?.rol === 'admin' ? 'Administrador' : 'Solo consulta'}</span>
          </div>
          <button className="btn-icono btn-icono--claro" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión"><Icono nombre="salir" /></button>
        </div>
      </aside>
      <div className="barra-movil">
        <button className="btn-icono" onClick={() => setMenu(true)} aria-label="Abrir menú"><Icono nombre="menu" /></button>
        <span className="logo" aria-hidden="true">N</span>
        <span>{NAV.find((n) => (n.fin ? loc.pathname === n.a : loc.pathname.startsWith(n.a)))?.texto}</span>
      </div>
      <main id="contenido" className="contenido" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
