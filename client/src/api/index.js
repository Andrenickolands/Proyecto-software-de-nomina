// Todas las llamadas a la API en un solo lugar
import { http } from './cliente.js';

const q = (o) => new URLSearchParams(o).toString();

export const api = {
  auth: {
    ingresar: (email, password) => http.post('/auth/login', { email, password }),
    cambiarPassword: (actual, nueva) => http.put('/auth/password', { actual, nueva }),
  },
  usuarios: { listar: () => http.get('/usuarios'), crear: (u) => http.post('/usuarios', u), eliminar: (id) => http.del(`/usuarios/${id}`) },
  auditoria: () => http.get('/auditoria'),
  catalogos: () => http.get('/catalogos'),
  resumen: () => http.get('/resumen'),
  empresa: { obtener: () => http.get('/empresa'), guardar: (e) => http.put('/empresa', e) },
  sedes: {
    listar: () => http.get('/sedes'),
    crear: (s) => http.post('/sedes', s),
    actualizar: (id, s) => http.put(`/sedes/${id}`, s),
    eliminar: (id) => http.del(`/sedes/${id}`),
  },
  colaboradores: {
    listar: () => http.get('/colaboradores'),
    calcularTerminacion: (id, d) => http.post(`/colaboradores/${id}/terminacion/calcular`, d),
    guardarTerminacion: (id, d) => http.post(`/colaboradores/${id}/terminacion`, d),
    crear: (c) => http.post('/colaboradores', c),
    actualizar: (id, c) => http.put(`/colaboradores/${id}`, c),
    eliminar: (id) => http.del(`/colaboradores/${id}`),
  },
  parametros: {
    listar: () => http.get('/parametros'),
    vigente: (fecha) => http.get(`/parametros/vigente?${q({ fecha })}`),
    crear: (p) => http.post('/parametros', p),
    actualizar: (id, p) => http.put(`/parametros/${id}`, p),
    eliminar: (id) => http.del(`/parametros/${id}`),
  },
  festivos: {
    listar: (anio) => http.get(`/festivos?${q({ anio })}`),
    guardar: (f) => http.post('/festivos', f),
    generar: (anio) => http.post('/festivos/generar', { anio }),
    eliminar: (fecha) => http.del(`/festivos/${fecha}`),
  },
  periodos: {
    listar: () => http.get('/periodos'),
    abrir: (anio, mes, quincena) => http.post('/periodos', { anio, mes, quincena }),
    asistencia: (id) => http.get(`/periodos/${id}/asistencia`),
    generarAsistencia: (id, sobrescribir = false) => http.post(`/periodos/${id}/asistencia/generar`, { sobrescribir }),
    guardarAsistencia: (id, registros) => http.put(`/periodos/${id}/asistencia`, registros),
    novedades: (id) => http.get(`/periodos/${id}/novedades`),
    agregarNovedad: (id, n) => http.post(`/periodos/${id}/novedades`, n),
    eliminarNovedad: (nid) => http.del(`/novedades/${nid}`),
    nomina: (id) => http.get(`/periodos/${id}/nomina`),
    liquidar: (id) => http.post(`/periodos/${id}/liquidar`),
    reabrir: (id) => http.post(`/periodos/${id}/reabrir`),
  },
  terminaciones: { listar: () => http.get('/terminaciones'), eliminar: (id) => http.del(`/terminaciones/${id}`) },
  asistenciaRango: (d) => http.post('/asistencia/rango', d),
  pagos: (fecha, modo) => http.get(`/pagos?${q({ fecha, modo })}`),
  consolidado: (anio, mes) => http.get(`/consolidado?${q({ anio, mes })}`),
};
