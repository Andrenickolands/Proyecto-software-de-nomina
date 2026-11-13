// Toda la configuración sale de variables de entorno
import crypto from 'node:crypto';

const env = process.env;
const produccion = env.NODE_ENV === 'production';

function secretoJwt() {
  if (env.JWT_SECRET && env.JWT_SECRET.length >= 32) return env.JWT_SECRET;
  if (produccion) {
    throw new Error('JWT_SECRET es obligatorio en producción y debe tener al menos 32 caracteres.');
  }
  // en local no importa, se crea uno cada vez que arranca
  return crypto.randomBytes(48).toString('hex');
}

export const config = Object.freeze({
  produccion,
  puerto: Number(env.PORT || 3000),
  baseDatos: {
    url: env.DATABASE_URL || null,
    ssl: env.DATABASE_SSL !== 'false',
    archivoSqlite: env.SQLITE_FILE || 'data/nomina.sqlite',
  },
  seguridad: {
    jwtSecreto: secretoJwt(),
    jwtExpira: env.JWT_EXPIRES || '8h',
    costoBcrypt: 12,
    origenesCors: (env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
    intentosLogin: Number(env.LOGIN_MAX_ATTEMPTS || 10),
  },
  semilla: {
    adminEmail: (env.ADMIN_EMAIL || 'admin@nomina.co').toLowerCase(),
    adminPassword: env.ADMIN_PASSWORD || null,
    demo: env.SEED_DEMO !== 'false',
  },
  publicDir: env.PUBLIC_DIR || 'public',
});
