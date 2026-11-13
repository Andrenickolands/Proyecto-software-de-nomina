import { useCallback, useEffect, useRef, useState } from 'react';

// Hace la petición y devuelve datos, cargando, error y una función para recargar
export function useCarga(fn, deps = []) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const vivo = useRef(true);
  const recargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const datos = await fn();
      if (vivo.current) setEstado({ datos, cargando: false, error: null });
    } catch (error) {
      if (vivo.current) setEstado((e) => ({ ...e, cargando: false, error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    vivo.current = true;
    recargar();
    return () => { vivo.current = false; };
  }, [recargar]);
  return { ...estado, recargar, setDatos: (d) => setEstado((e) => ({ ...e, datos: typeof d === 'function' ? d(e.datos) : d })) };
}
