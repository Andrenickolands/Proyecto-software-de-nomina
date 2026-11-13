// Si hay DATABASE_URL usa Postgres, si no, un archivo SQLite
import knexFactory from 'knex';
import fs from 'node:fs';
import path from 'node:path';

export function crearConexion({ url, ssl, archivoSqlite }) {
  if (url) {
    const local = /localhost|127\.0\.0\.1|@db[:/]/.test(url);
    return {
      motor: 'postgres',
      db: knexFactory({
        client: 'pg',
        connection: { connectionString: url, ssl: ssl && !local ? { rejectUnauthorized: false } : false },
        pool: { min: 0, max: 5 },
      }),
    };
  }
  const archivo = path.resolve(archivoSqlite);
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const db = knexFactory({
    client: 'better-sqlite3',
    connection: { filename: archivo },
    useNullAsDefault: true,
    pool: { afterCreate: (conn, done) => { conn.pragma('foreign_keys = ON'); done(); } },
  });
  return { motor: 'sqlite', db };
}

// pg devuelve [{id}] y sqlite a veces [id], esto lo deja igual
export async function insertarRetornandoId(qb, datos) {
  const [fila] = await qb.insert(datos).returning('id');
  return typeof fila === 'object' ? fila.id : fila;
}
