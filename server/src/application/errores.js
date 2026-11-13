// Errores con su código HTTP para responderle bien al front
export class ErrorAplicacion extends Error {
  constructor(mensaje, codigo = 'ERROR', estado = 400) {
    super(mensaje);
    this.codigo = codigo;
    this.estado = estado;
  }
}
export const noEncontrado = (m) => new ErrorAplicacion(m, 'NO_ENCONTRADO', 404);
export const conflicto = (m) => new ErrorAplicacion(m, 'CONFLICTO', 409);
export const invalido = (m) => new ErrorAplicacion(m, 'INVALIDO', 400);
export const noAutorizado = (m) => new ErrorAplicacion(m, 'NO_AUTORIZADO', 401);
export const prohibido = (m) => new ErrorAplicacion(m, 'PROHIBIDO', 403);
