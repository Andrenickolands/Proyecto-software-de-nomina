import { createContext, useCallback, useContext, useState } from 'react';

const Ctx = createContext(() => {});

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => <div key={a.id} className={`aviso aviso--${a.tipo}`}>{a.texto}</div>)}
      </div>
    </Ctx.Provider>
  );
}

export const useAvisos = () => useContext(Ctx);
