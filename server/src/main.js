// Aquí se arma todo: base de datos, repositorios, servicios y la app de Express.
// Es el único archivo que conoce las clases concretas.
import { config } from './config.js';
import { crearConexion } from './infrastructure/db/conexion.js';
import { migrar } from './infrastructure/db/esquema.js';
import { sembrar } from './infrastructure/db/semilla.js';
import { crearRepositorios } from './infrastructure/repositorios/index.js';
import { crearHasher, crearEmisorTokens } from './infrastructure/seguridad/index.js';
import { crearProveedorContexto } from './application/contextoLiquidacion.js';
import { crearAuthService } from './application/authService.js';
import { crearConfiguracionService } from './application/configuracionService.js';
import { crearPersonalService } from './application/personalService.js';
import { crearAsistenciaService } from './application/asistenciaService.js';
import { crearNominaService } from './application/nominaService.js';
import { crearApp } from './interfaces/http/app.js';

export async function construir(cfg = config) {
  const { db, motor } = crearConexion(cfg.baseDatos);
  await migrar(db);
  const repos = crearRepositorios(db);
  const hasher = crearHasher({ costo: cfg.seguridad.costoBcrypt });
  const tokens = crearEmisorTokens({ secreto: cfg.seguridad.jwtSecreto, expira: cfg.seguridad.jwtExpira });
  await sembrar(repos, hasher, { ...cfg.semilla, produccion: cfg.produccion });

  const contexto = crearProveedorContexto({ repos });
  const asistencia = crearAsistenciaService({ repos, contexto });
  const servicios = {
    auth: crearAuthService({ repos, hasher, tokens }),
    configuracion: crearConfiguracionService({ repos, contexto }),
    personal: crearPersonalService({ repos, contexto }),
    asistencia,
    nomina: crearNominaService({ repos, contexto, asistencia }),
  };
  return { app: crearApp({ servicios, config: cfg, motor }), db, motor };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { app, db, motor } = await construir();
  const server = app.listen(config.puerto, () => console.log(`Nómina lista en el puerto ${config.puerto} (${motor})`));
  const cerrar = () => server.close(() => db.destroy().then(() => process.exit(0)));
  process.on('SIGTERM', cerrar);
  process.on('SIGINT', cerrar);
}
