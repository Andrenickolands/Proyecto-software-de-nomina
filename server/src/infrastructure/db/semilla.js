// Lo que se carga la primera vez: admin, parámetros, festivos y datos de prueba (inventados)
import crypto from 'node:crypto';
import { VERSIONES_SEMILLA } from '../../domain/parametros.js';
import { festivosColombia } from '../../domain/festivos.js';

export const EMPRESA_DEFECTO = Object.freeze({ razon_social: 'Mi Empresa S.A.S.', nit: '900.000.000-0', ciudad: 'Bogotá D.C.' });

export async function sembrar(repos, hasher, { adminEmail, adminPassword, demo, produccion }, log = console) {
  if (!(await repos.usuarios.hayAlguno())) {
    let clave = adminPassword;
    if (!clave) {
      clave = produccion ? crypto.randomBytes(12).toString('base64url') : 'admin12345';
      log.warn(`[semilla] Contraseña inicial del administrador (${adminEmail}): ${clave}  -> cámbiala al ingresar.`);
    }
    await repos.usuarios.crear({ email: adminEmail, nombre: 'Administrador', password_hash: await hasher.hash(clave), rol: 'admin' });
  }
  if (!(await repos.ajustes.obtener('empresa', null))) await repos.ajustes.guardar('empresa', EMPRESA_DEFECTO);
  if ((await repos.parametros.contar()) === 0) {
    for (const v of VERSIONES_SEMILLA) await repos.parametros.crear(v);
  }
  if (!(await repos.festivos.hayAlguno())) {
    for (const anio of [2025, 2026, 2027]) await repos.festivos.guardar(festivosColombia(anio));
  }
  if (demo && (await repos.sedes.contar()) === 0) {
    const centro = await repos.sedes.crear({ nombre: 'Sede Centro', direccion: 'Cra. 10 # 12-34', ciudad: 'Bogotá' });
    const norte = await repos.sedes.crear({ nombre: 'Sede Norte', direccion: 'Cl. 140 # 15-20', ciudad: 'Bogotá' });
    const base = { fecha_ingreso: '2026-01-15', nivel_arl: 1, eps: 'Nueva EPS', afp: 'Colpensiones', descanso_min: 30 };
    const personas = [
      { documento: '1010000001', nombre: 'Laura Méndez Ortiz', cargo: 'Vendedora principal', sede_id: centro, salario_base: 2800000, tipo_horario: 'extendido', dia_descanso: 2, entrada: '09:00', salida: '18:00' },
      { documento: '1010000002', nombre: 'Camila Torres Ríos', cargo: 'Asesora comercial', sede_id: centro, salario_base: 1750905, tipo_horario: 'rotativo', estudia: 1, dia_descanso: 4, entrada: '09:00', salida: '17:00' },
      { documento: '1010000003', nombre: 'Diana Vargas Peña', cargo: 'Cajera', sede_id: centro, salario_base: 1750905, tipo_horario: 'rotativo', dia_descanso: 5, entrada: '09:30', salida: '18:00' },
      { documento: '1010000004', nombre: 'Andrea Rojas Cifuentes', cargo: 'Asesora comercial', sede_id: norte, salario_base: 1750905, tipo_horario: 'rotativo', estudia: 1, dia_descanso: 1, entrada: '09:00', salida: '17:00' },
      { documento: '1010000005', nombre: 'Julián Castro Medina', cargo: 'Bodeguero', sede_id: norte, salario_base: 1900000, forma_pago: 'mensual', tipo_horario: 'extendido', dia_descanso: 0, entrada: '09:00', salida: '18:00' },
      { documento: '1010000006', nombre: 'Mateo Herrera Gil', cargo: 'Auxiliar por días', sede_id: norte, tipo_vinculo: 'jornal', valor_dia: 100000, forma_pago: 'semanal', dia_descanso: 0, entrada: '09:00', salida: '18:00' },
    ];
    for (const p of personas) await repos.colaboradores.crear({ ...base, ...p });
  }
}
