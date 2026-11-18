import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import {
  AuthAlert,
  AuthLayout,
  authButtonClass,
  authInputClass,
  authLinkClass,
} from '../components/AuthLayout';
import api, { getErrorMessage } from '../lib/api';

type Status = 'cargando' | 'disponible' | 'sin-correo';

/** Paso 1 de la recuperación: pedir el enlace por correo (RF-22). */
export function ForgotPasswordPage() {
  const [status, setStatus] = useState<Status>('cargando');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get<{ correoDisponible: boolean }>('/auth/password-recovery')
      .then(
        ({ data }) =>
          active && setStatus(data.correoDisponible ? 'disponible' : 'sin-correo'),
      )
      // Si no se puede consultar, se muestra el formulario: el servidor responde igual.
      .catch(() => active && setStatus('disponible'));
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post<{ message: string }>('/auth/forgot-password', {
        email: email.trim(),
      });
      setSentMessage(data.message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const backToLogin = (
    <p className="mt-8 text-center text-sm">
      <Link to="/login" className={`inline-flex items-center gap-1.5 ${authLinkClass}`}>
        <ArrowLeft className="h-4 w-4" />
        Volver a iniciar sesión
      </Link>
    </p>
  );

  if (status === 'sin-correo') {
    return (
      <AuthLayout title="Recupera tu contraseña">
        <AuthAlert tone="info">
          La recuperación por correo todavía no está activada. Pide al administrador que
          te asigne una contraseña nueva desde la sección <strong>Usuarios</strong>.
        </AuthAlert>
        {backToLogin}
      </AuthLayout>
    );
  }

  if (sentMessage) {
    return (
      <AuthLayout title="Revisa tu correo">
        <AuthAlert tone="success">{sentMessage}</AuthAlert>
        <p className="mt-4 text-xs text-slate-500">
          El enlace vence en 30 minutos y solo sirve una vez. Si no llega, espera un
          momento y vuelve a pedirlo.
        </p>
        {backToLogin}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recupera tu contraseña"
      subtitle="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <div className="relative">
          <label htmlFor="recover-email" className="sr-only">
            Correo electrónico
          </label>
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="recover-email"
            type="email"
            autoComplete="email"
            required
            maxLength={160}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo electrónico"
            className={authInputClass}
          />
        </div>
        <button
          type="submit"
          disabled={submitting || status === 'cargando'}
          className={authButtonClass}
        >
          {submitting ? (
            'Enviando…'
          ) : (
            <>
              Enviar enlace
              <Send className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
      {backToLogin}
    </AuthLayout>
  );
}
