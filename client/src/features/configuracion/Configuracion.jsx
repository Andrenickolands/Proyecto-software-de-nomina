import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../context/Auth.jsx';
import { Encabezado } from '../../components/ui.jsx';
import { Parametros } from './Parametros.jsx';
import { Festivos } from './Festivos.jsx';
import { Auditoria, Empresa, MiCuenta, Usuarios } from './Cuentas.jsx';

export function Configuracion() {
  const { esAdmin } = useAuth();
  const pestañas = [
    ['parametros', 'Parámetros legales'], ['festivos', 'Festivos'], ['empresa', 'Empresa'],
    ...(esAdmin ? [['usuarios', 'Usuarios'], ['auditoria', 'Actividad']] : []), ['cuenta', 'Mi contraseña'],
  ];
  return (
    <div className="pagina">
      <Encabezado titulo="Configuración" descripcion="Constantes de la normatividad colombiana, calendario de festivos y accesos." />
      <nav className="pestanas" aria-label="Secciones de configuración">
        {pestañas.map(([ruta, texto]) => <NavLink key={ruta} to={ruta} className={({ isActive }) => (isActive ? 'activa' : '')}>{texto}</NavLink>)}
      </nav>
      <Routes>
        <Route index element={<Navigate to="parametros" replace />} />
        <Route path="parametros" element={<Parametros />} />
        <Route path="festivos" element={<Festivos />} />
        <Route path="empresa" element={<Empresa />} />
        {esAdmin && <Route path="usuarios" element={<Usuarios />} />}
        {esAdmin && <Route path="auditoria" element={<Auditoria />} />}
        <Route path="cuenta" element={<MiCuenta />} />
      </Routes>
    </div>
  );
}
