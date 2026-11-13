// Carga los parámetros y festivos que necesita el cálculo
import { selectorParametros } from '../domain/parametros.js';

export const crearProveedorContexto = ({ repos }) => ({
  async obtener() {
    const [versiones, festivos] = await Promise.all([repos.parametros.listar(), repos.festivos.fechas()]);
    return { getParams: selectorParametros(versiones), festivos };
  },
});
