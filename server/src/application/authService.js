import { invalido, noAutorizado, conflicto, noEncontrado } from './errores.js';

export function crearAuthService({ repos, hasher, tokens }) {
  // si el correo no existe igual se compara contra un hash de mentira,
  // así no se puede saber por el tiempo de respuesta si el usuario existe
  const señuelo = hasher.hash('señuelo-no-valido');
  const publico = (u) => ({ id: u.id, email: u.email, nombre: u.nombre, rol: u.rol });

  return {
    async ingresar(email, password) {
      const u = await repos.usuarios.porEmail(email.toLowerCase().trim());
      const ok = await hasher.comparar(password, u ? u.password_hash : await señuelo);
      if (!u || !ok) throw noAutorizado('El correo o la contraseña no coinciden.');
      await repos.auditoria.registrar({ usuario_id: u.id, usuario_email: u.email, accion: 'ingreso' });
      return { token: tokens.emitir({ sub: String(u.id), email: u.email, nombre: u.nombre, rol: u.rol }), usuario: publico(u) };
    },

    verificar(token) {
      try {
        const p = tokens.verificar(token);
        return { id: Number(p.sub), email: p.email, nombre: p.nombre, rol: p.rol };
      } catch {
        throw noAutorizado('Tu sesión venció. Ingresa de nuevo.');
      }
    },

    async cambiarPassword(actor, actual, nueva) {
      const u = await repos.usuarios.porId(actor.id);
      if (!u || !(await hasher.comparar(actual, u.password_hash))) throw invalido('La contraseña actual no es correcta.');
      await repos.usuarios.actualizar(u.id, { password_hash: await hasher.hash(nueva) });
      await repos.auditoria.registrar({ usuario_id: u.id, usuario_email: u.email, accion: 'cambio_password' });
    },

    listarUsuarios: () => repos.usuarios.listar(),

    async crearUsuario(actor, { email, nombre, password, rol }) {
      const correo = email.toLowerCase().trim();
      if (await repos.usuarios.porEmail(correo)) throw conflicto('Ya existe un usuario con ese correo.');
      const id = await repos.usuarios.crear({ email: correo, nombre, rol, password_hash: await hasher.hash(password) });
      await repos.auditoria.registrar({ usuario_id: actor.id, usuario_email: actor.email, accion: 'crear_usuario', entidad: 'usuario', entidad_id: String(id) });
      return publico(await repos.usuarios.porId(id));
    },

    async eliminarUsuario(actor, id) {
      const u = await repos.usuarios.porId(id);
      if (!u) throw noEncontrado('Ese usuario no existe.');
      if (u.id === actor.id) throw invalido('No puedes eliminar tu propio usuario.');
      if (u.rol === 'admin' && (await repos.usuarios.contarAdmins()) <= 1) throw invalido('Debe quedar al menos un administrador.');
      await repos.usuarios.eliminar(id);
      await repos.auditoria.registrar({ usuario_id: actor.id, usuario_email: actor.email, accion: 'eliminar_usuario', entidad: 'usuario', entidad_id: String(id) });
    },
  };
}
