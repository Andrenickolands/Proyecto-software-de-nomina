import { useState } from 'react';
import { useAuth } from '../../context/Auth.jsx';
import { Boton, Campo, InputClave } from '../../components/ui.jsx';

export function Ingreso() {
  const { ingresar, vencida } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(vencida ? 'Tu sesión venció. Ingresa de nuevo.' : '');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      await ingresar(form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="ingreso">
      <section className="ingreso__lado" aria-hidden="true">
        <span className="logo logo--grande">N</span>
        <p className="ingreso__frase">Asistencia, horas extra, recargos y aportes de cada quincena en un solo lugar.</p>
        <div className="ingreso__talon">
          <span>Neto a pagar</span>
          <strong>$ 1.104.855</strong>
          <small>Salario + auxilio + 12 h dominicales − salud − pensión</small>
        </div>
      </section>
      <section className="ingreso__form">
        <form onSubmit={enviar} noValidate>
          <h1>Ingresar</h1>
          <p className="texto-suave">Usa el correo y la contraseña que te asignó el administrador.</p>
          <Campo etiqueta="Correo">
            {(id) => <input id={id} type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
          </Campo>
          <Campo etiqueta="Contraseña">
            {(id) => <InputClave id={id} autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
          </Campo>
          {error && <p className="alerta alerta--error" role="alert">{error}</p>}
          <Boton variante="primario" type="submit" cargando={cargando} className="btn--bloque">Ingresar</Boton>
        </form>
      </section>
    </div>
  );
}
