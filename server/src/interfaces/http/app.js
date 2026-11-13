import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { crearRutas } from './rutas.js';
import { manejarErrores } from './middlewares/index.js';

export function crearApp({ servicios, config, motor, log = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // en Render hay un proxy delante, sin esto el rate limit ve una sola IP

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  // CORS solo si se configura; normalmente el front y la API van en el mismo dominio
  if (config.seguridad.origenesCors.length) app.use('/api', cors({ origin: config.seguridad.origenesCors }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  app.use('/api', crearRutas({ servicios, config, motor }));

  const publico = path.resolve(config.publicDir);
  if (fs.existsSync(publico)) {
    app.use(express.static(publico, { index: false, maxAge: '7d', setHeaders: (res, f) => { if (f.endsWith('.html')) res.set('Cache-Control', 'no-cache'); } }));
    app.get('*', (req, res) => res.sendFile(path.join(publico, 'index.html')));
  }

  app.use(manejarErrores(log));
  return app;
}
