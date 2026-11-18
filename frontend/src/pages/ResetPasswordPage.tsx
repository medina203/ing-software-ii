import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import {
  AuthAlert,
  AuthLayout,
  authButtonClass,
  authInputClass,
  authLinkClass,
} from '../components/AuthLayout';
import api, { getErrorMessage } from '../lib/api';

type Status = 'validando' | 'valido' | 'invalido' | 'listo';

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;

/** Devuelve el mensaje de error de la nueva contraseña, o '' si es válida. */
export function newPasswordError(password: string, confirmation: string): string {
  if (password.length < MIN_PASSWORD) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  }
  if (password.length > MAX_PASSWORD) {
    return `La contraseña no puede superar ${MAX_PASSWORD} caracteres.`;
  }
  if (password !== confirmation) return 'Las contraseñas no coinciden.';
  return '';
}

/** Paso 2 de la recuperación: crear la contraseña nueva desde el enlace (RF-22). */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  // Se lee una sola vez y se quita de la barra de direcciones y del historial.
  const [token] = useState(() => params.get('token') ?? '');
  const [status, setStatus] = useState<Status>(token ? 'validando' : 'invalido');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (!token) return;
    let active = true;
    api
      .get<{ valido: boolean }>('/auth/reset-password/validate', { params: { token } })
      .then(({ data }) => active && setStatus(data.valido ? 'valido' : 'invalido'))
      .catch(() => active && setStatus('invalido'));
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = newPasswordError(password, confirmation);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setStatus('listo');
    } catch (resetError) {
      setError(getErrorMessage(resetError));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'validando') {
    return (
      <AuthLayout title="Crea una contraseña nueva">
        <p className="text-sm text-slate-500" role="status">
          Comprobando el enlace…
        </p>
      </AuthLayout>
    );
  }

  if (status === 'invalido') {
    return (
      <AuthLayout title="Enlace no válido">
        <AuthAlert tone="error">
          El enlace no es válido o ya venció. Cada enlace dura 30 minutos y deja de servir
          cuando la contraseña ya se cambió. Si pediste varios, abre el correo más
          reciente (la hora aparece en el asunto).
        </AuthAlert>
        <p className="mt-8 text-center text-sm">
          <Link to="/recuperar-contrasena" className={authLinkClass}>
            Pedir un enlace nuevo
          </Link>
        </p>
      </AuthLayout>
    );
  }

  if (status === 'listo') {
    return (
      <AuthLayout title="Contraseña actualizada">
        <AuthAlert tone="success">
          Tu contraseña se cambió correctamente. Por seguridad, se cerraron las sesiones
          que estuvieran abiertas en otros dispositivos.
        </AuthAlert>
        <Link to="/login" replace className={`mt-6 ${authButtonClass}`}>
          Iniciar sesión
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </AuthLayout>
    );
  }

  const inputType = showPassword ? 'text' : 'password';
  return (
    <AuthLayout
      title="Crea una contraseña nueva"
      subtitle={`Usa al menos ${MIN_PASSWORD} caracteres.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <div className="relative">
          <label htmlFor="new-password" className="sr-only">
            Nueva contraseña
          </label>
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="new-password"
            type={inputType}
            autoComplete="new-password"
            required
            maxLength={MAX_PASSWORD}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nueva contraseña"
            className={`${authInputClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-slate-200"
            aria-label={showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="relative">
          <label htmlFor="confirm-password" className="sr-only">
            Confirmar contraseña
          </label>
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="confirm-password"
            type={inputType}
            autoComplete="new-password"
            required
            maxLength={MAX_PASSWORD}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Confirmar contraseña"
            className={authInputClass}
          />
        </div>
        <button type="submit" disabled={submitting} className={authButtonClass}>
          {submitting ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthLayout>
  );
}
