// Rutas de la API. Cada una valida lo que llega y le pasa el trabajo al servicio.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ah, validar, autenticar, soloAdmin, escrituraAdmin } from './middlewares/index.js';
import * as E from './esquemas.js';
import { LISTA_ESTADOS } from '../../domain/horas.js';
import { TIPOS_NOVEDAD, tiposVinculo, formasPago, MOTIVOS, TIPOS_CONTRATO } from '../../domain/liquidacion/index.js';
import { PARAMETROS_BASE } from '../../domain/parametros.js';

const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export function crearRutas({ servicios, config, motor }) {
  const { auth, configuracion, personal, asistencia, nomina } = servicios;
  const r = Router();
  const porId = validar(E.id, 'params');

  r.get('/health', (req, res) => res.json({ ok: true, db: motor }));

  const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.seguridad.intentosLogin,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.' },
  });
  r.post('/auth/login', limiteLogin, validar(E.login), ah(async (req, res) => {
    res.json(await auth.ingresar(req.body.email, req.body.password));
  }));

  // de aquí para abajo hay que estar logueado
  r.use(autenticar(auth));
  r.get('/auth/me', (req, res) => res.json(req.usuario));
  // cualquiera puede cambiar su clave
  r.put('/auth/password', validar(E.password), ah(async (req, res) => {
    await auth.cambiarPassword(req.usuario, req.body.actual, req.body.nueva);
    res.json({ ok: true });
  }));
  // para crear, editar o borrar hay que ser admin
  r.use(escrituraAdmin);

  r.get('/usuarios', soloAdmin, ah(async (req, res) => res.json(await auth.listarUsuarios())));
  r.post('/usuarios', validar(E.usuario), ah(async (req, res) => res.status(201).json(await auth.crearUsuario(req.usuario, req.body))));
  r.delete('/usuarios/:id', porId, ah(async (req, res) => { await auth.eliminarUsuario(req.usuario, req.params.id); res.json({ ok: true }); }));
  r.get('/auditoria', soloAdmin, ah(async (req, res) => res.json(await configuracion.auditoria(100))));

  r.get('/catalogos', (req, res) => res.json({ estados: LISTA_ESTADOS, tipos_novedad: TIPOS_NOVEDAD, tipos_vinculo: tiposVinculo(), formas_pago: formasPago(), motivos_retiro: MOTIVOS, tipos_contrato: TIPOS_CONTRATO, parametros_base: PARAMETROS_BASE }));

  r.get('/empresa', ah(async (req, res) => res.json(await configuracion.obtenerEmpresa())));
  r.put('/empresa', validar(E.empresa), ah(async (req, res) => res.json(await configuracion.guardarEmpresa(req.usuario, req.body))));

  r.get('/sedes', ah(async (req, res) => res.json(await personal.listarSedes())));
  r.post('/sedes', validar(E.sede), ah(async (req, res) => res.status(201).json(await personal.crearSede(req.usuario, req.body))));
  r.put('/sedes/:id', porId, validar(E.sede), ah(async (req, res) => res.json(await personal.actualizarSede(req.usuario, req.params.id, req.body))));
  r.delete('/sedes/:id', porId, ah(async (req, res) => { await personal.eliminarSede(req.usuario, req.params.id); res.json({ ok: true }); }));

  r.get('/colaboradores', ah(async (req, res) => res.json(await personal.listarColaboradores())));
  r.get('/colaboradores/:id', porId, ah(async (req, res) => res.json(await personal.obtenerColaborador(req.params.id))));
  r.post('/colaboradores', validar(E.colaborador), ah(async (req, res) => res.status(201).json(await personal.crearColaborador(req.usuario, req.body))));
  r.put('/colaboradores/:id', porId, validar(E.colaborador), ah(async (req, res) => res.json(await personal.actualizarColaborador(req.usuario, req.params.id, req.body))));
  r.delete('/colaboradores/:id', porId, ah(async (req, res) => { await personal.eliminarColaborador(req.usuario, req.params.id); res.json({ ok: true }); }));

  r.post('/colaboradores/:id/terminacion/calcular', porId, validar(E.terminacion), ah(async (req, res) => res.json(await personal.calcularTerminacion(req.params.id, req.body))));
  r.post('/colaboradores/:id/terminacion', porId, validar(E.terminacion), ah(async (req, res) => res.status(201).json(await personal.guardarTerminacion(req.usuario, req.params.id, req.body))));
  r.get('/terminaciones', ah(async (req, res) => res.json(await personal.listarTerminaciones())));
  r.delete('/terminaciones/:id', porId, ah(async (req, res) => { await personal.eliminarTerminacion(req.usuario, req.params.id); res.json({ ok: true }); }));
  r.post('/asistencia/rango', validar(E.rangoAsistencia), ah(async (req, res) => res.json(await asistencia.registrarRango(req.usuario, req.body))));

  r.get('/parametros', ah(async (req, res) => res.json(await configuracion.listarParametros())));
  r.get('/parametros/vigente', ah(async (req, res) => {
    const f = /^\d{4}-\d{2}-\d{2}$/.test(req.query.fecha || '') ? req.query.fecha : hoy();
    res.json(await configuracion.parametrosVigentes(f));
  }));
  r.post('/parametros', validar(E.parametros), ah(async (req, res) => res.status(201).json(await configuracion.crearParametros(req.usuario, req.body))));
  r.put('/parametros/:id', porId, validar(E.parametros), ah(async (req, res) => { await configuracion.actualizarParametros(req.usuario, req.params.id, req.body); res.json({ ok: true }); }));
  r.delete('/parametros/:id', porId, ah(async (req, res) => { await configuracion.eliminarParametros(req.usuario, req.params.id); res.json({ ok: true }); }));

  r.get('/festivos', validar(E.anio, 'query'), ah(async (req, res) => res.json(await configuracion.festivosDelAnio(req.query.anio))));
  r.post('/festivos', validar(E.festivo), ah(async (req, res) => res.status(201).json(await configuracion.guardarFestivo(req.usuario, req.body))));
  r.post('/festivos/generar', validar(E.anio), ah(async (req, res) => res.json(await configuracion.generarFestivos(req.usuario, req.body.anio))));
  r.delete('/festivos/:fecha', ah(async (req, res) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.fecha)) return res.status(400).json({ error: 'Fecha no válida.' });
    await configuracion.eliminarFestivo(req.usuario, req.params.fecha);
    res.json({ ok: true });
  }));

  r.get('/periodos', ah(async (req, res) => res.json(await nomina.listarPeriodos())));
  r.post('/periodos', validar(E.periodo), ah(async (req, res) => res.status(201).json(await nomina.abrirPeriodo(req.usuario, req.body))));

  r.get('/periodos/:id/asistencia', porId, ah(async (req, res) => res.json(await asistencia.obtener(req.params.id))));
  r.post('/periodos/:id/asistencia/generar', porId, validar(E.generar), ah(async (req, res) => res.json(await asistencia.generar(req.usuario, req.params.id, req.body))));
  r.put('/periodos/:id/asistencia', porId, validar(E.registros), ah(async (req, res) => res.json(await asistencia.guardar(req.usuario, req.params.id, req.body))));

  r.get('/periodos/:id/novedades', porId, ah(async (req, res) => res.json(await nomina.novedades(req.params.id))));
  r.post('/periodos/:id/novedades', porId, validar(E.novedad), ah(async (req, res) => res.status(201).json(await nomina.agregarNovedad(req.usuario, req.params.id, req.body))));
  r.delete('/novedades/:id', porId, ah(async (req, res) => { await nomina.eliminarNovedad(req.usuario, req.params.id); res.json({ ok: true }); }));

  r.get('/periodos/:id/nomina', porId, ah(async (req, res) => res.json(await nomina.nomina(req.params.id))));
  r.post('/periodos/:id/liquidar', porId, ah(async (req, res) => res.json(await nomina.liquidar(req.usuario, req.params.id))));
  r.post('/periodos/:id/reabrir', porId, ah(async (req, res) => res.json(await nomina.reabrir(req.usuario, req.params.id))));

  r.get('/consolidado', validar(E.mesAnio, 'query'), ah(async (req, res) => res.json(await nomina.consolidado(req.query.anio, req.query.mes))));
  r.get('/pagos', validar(E.consultaPagos, 'query'), ah(async (req, res) => res.json(await nomina.pagosJornal(req.query.fecha, req.query.modo))));
  r.get('/resumen', ah(async (req, res) => res.json(await nomina.resumen(hoy()))));

  r.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  return r;
}
