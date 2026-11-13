import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { sesion } from '../api/cliente.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [actual, setActual] = useState(() => sesion.leer());
  const [vencida, setVencida] = useState(false);

  useEffect(() => sesion.alVencer(() => { setActual(null); setVencida(true); }), []);

  const valor = useMemo(() => ({
    usuario: actual?.usuario || null,
    esAdmin: actual?.usuario?.rol === 'admin',
    vencida,
    async ingresar(email, password) {
      const s = await api.auth.ingresar(email, password);
      sesion.guardar(s);
      setVencida(false);
      setActual(s);
    },
    salir() {
      sesion.borrar();
      setActual(null);
    },
  }), [actual, vencida]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
