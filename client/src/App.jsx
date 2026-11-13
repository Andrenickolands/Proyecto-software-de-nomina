import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/Auth.jsx';
import { PeriodoProvider } from './context/Periodo.jsx';
import { Marco } from './components/Marco.jsx';
import { Ingreso } from './features/auth/Ingreso.jsx';
import { Resumen } from './features/resumen/Resumen.jsx';
import { Colaboradores } from './features/personal/Colaboradores.jsx';
import { Sedes } from './features/personal/Sedes.jsx';
import { Asistencia } from './features/asistencia/Asistencia.jsx';
import { Nomina } from './features/nomina/Nomina.jsx';
import { Consolidado } from './features/consolidado/Consolidado.jsx';
import { Configuracion } from './features/configuracion/Configuracion.jsx';

export default function App() {
  const { usuario } = useAuth();
  if (!usuario) return <Ingreso />;
  return (
    <PeriodoProvider>
      <Routes>
        <Route element={<Marco />}>
          <Route index element={<Resumen />} />
          <Route path="asistencia" element={<Asistencia />} />
          <Route path="nomina" element={<Nomina />} />
          <Route path="consolidado" element={<Consolidado />} />
          <Route path="colaboradores" element={<Colaboradores />} />
          <Route path="sedes" element={<Sedes />} />
          <Route path="configuracion/*" element={<Configuracion />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </PeriodoProvider>
  );
}
