import { ErrorAplicacion, prohibido } from '../../../application/errores.js';

// para no repetir try/catch en cada ruta async
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const validar = (esquema, origen = 'body') => (req, res, next) => {
  const r = esquema.safeParse(req[origen]);
  if (!r.success) {
    const primero = r.error.issues[0];
    return res.status(400).json({ error: primero?.message || 'Datos no válidos.', campo: primero?.path?.join('.'), detalles: r.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })) });
  }
  req[origen] = r.data;
  next();
};

export const autenticar = (authService) => (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) throw new ErrorAplicacion('Ingresa para continuar.', 'NO_AUTORIZADO', 401);
    req.usuario = authService.verificar(h.slice(7));
    next();
  } catch (e) {
    next(e);
  }
};

// el usuario de consulta puede ver (GET) pero no modificar
export const soloAdmin = (req, res, next) => (req.usuario?.rol === 'admin' ? next() : next(prohibido('Tu usuario es de solo consulta.')));
export const escrituraAdmin = (req, res, next) => (req.method === 'GET' ? next() : soloAdmin(req, res, next));

export const manejarErrores = (log) => (err, req, res, next) => {
  if (err instanceof ErrorAplicacion) return res.status(err.estado).json({ error: err.message, codigo: err.codigo });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido.' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande.' });
  log.error(err);
  // al cliente no se le muestra el error real, solo queda en el log
  return res.status(500).json({ error: 'Algo falló en el servidor. Inténtalo de nuevo en un momento.' });
};
