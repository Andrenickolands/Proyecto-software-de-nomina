// fetch con el token, errores en español y cierre de sesión si el token vence
const CLAVE = 'nomina.sesion';
let alVencer = () => {};

export const sesion = {
  // sessionStorage para que la sesión se borre al cerrar la pestaña
  leer: () => { try { return JSON.parse(sessionStorage.getItem(CLAVE)); } catch { return null; } },
  guardar: (s) => sessionStorage.setItem(CLAVE, JSON.stringify(s)),
  borrar: () => sessionStorage.removeItem(CLAVE),
  alVencer: (fn) => { alVencer = fn; },
};

export class ErrorApi extends Error {
  constructor(mensaje, estado, datos) {
    super(mensaje);
    this.estado = estado;
    this.datos = datos;
  }
}

async function pedir(metodo, ruta, cuerpo) {
  const s = sesion.leer();
  const res = await fetch(`/api${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(s?.token ? { Authorization: `Bearer ${s.token}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const datos = await res.json().catch(() => ({}));
  if (res.status === 401 && s?.token) {
    sesion.borrar();
    alVencer();
  }
  if (!res.ok) throw new ErrorApi(datos.error || 'No se pudo completar la acción.', res.status, datos);
  return datos;
}

export const http = {
  get: (r) => pedir('GET', r),
  post: (r, b = {}) => pedir('POST', r, b),
  put: (r, b) => pedir('PUT', r, b),
  del: (r) => pedir('DELETE', r),
};
