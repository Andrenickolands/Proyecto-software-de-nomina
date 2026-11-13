// bcrypt y jwt quedan aquí; los servicios los reciben ya armados
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const crearHasher = ({ costo }) => ({
  hash: (texto) => bcrypt.hash(texto, costo),
  comparar: (texto, hash) => bcrypt.compare(texto, hash),
});

export const crearEmisorTokens = ({ secreto, expira }) => ({
  emitir: (payload) => jwt.sign(payload, secreto, { expiresIn: expira, algorithm: 'HS256', issuer: 'nomina-co' }),
  verificar: (token) => jwt.verify(token, secreto, { algorithms: ['HS256'], issuer: 'nomina-co' }),
});
