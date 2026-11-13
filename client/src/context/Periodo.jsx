import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import { hoyBogota } from '../lib/formato.js';

// La quincena que está seleccionada en la barra lateral
const Ctx = createContext(null);
const CLAVE = 'nomina.periodo';

const quincenaDeHoy = () => {
  const [a, m, d] = hoyBogota().split('-').map(Number);
  return { anio: a, mes: m, quincena: d <= 15 ? 1 : 2 };
};

export function PeriodoProvider({ children }) {
  const [periodos, setPeriodos] = useState([]);
  const [actual, setActual] = useState(null);

  const cargar = useCallback(async () => {
    const lista = await api.periodos.listar();
    setPeriodos(lista);
    return lista;
  }, []);

  const seleccionar = useCallback(async (anio, mes, quincena) => {
    const p = await api.periodos.abrir(anio, mes, quincena);
    localStorage.setItem(CLAVE, JSON.stringify({ anio, mes, quincena }));
    setActual(p);
    await cargar();
    return p;
  }, [cargar]);

  const refrescarActual = useCallback(async () => {
    const lista = await cargar();
    setActual((a) => (a ? lista.find((p) => p.id === a.id) || a : a));
  }, [cargar]);

  useEffect(() => {
    let guardado = null;
    try { guardado = JSON.parse(localStorage.getItem(CLAVE)); } catch { /* sin preferencia */ }
    const q = guardado || quincenaDeHoy();
    seleccionar(q.anio, q.mes, q.quincena).catch(() => {});
  }, [seleccionar]);

  const valor = useMemo(() => ({ periodos, actual, seleccionar, refrescarActual }), [periodos, actual, seleccionar, refrescarActual]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const usePeriodo = () => useContext(Ctx);
