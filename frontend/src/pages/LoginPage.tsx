import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  AuthAlert,
  AuthLayout,
  authButtonClass,
  authInputClass,
  authLinkClass,
} from '../components/AuthLayout';
import { FullPageLoader } from '../components/ui/Feedback';
import { getErrorMessage } from '../lib/api';

export function LoginPage() {
  const { usuario, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <FullPageLoader />;
  if (usuario) {
    return <Navigate to={usuario.rol === 'ADMIN' ? '/' : '/inventario'} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      navigate(loggedUser.rol === 'ADMIN' ? '/' : '/inventario', {
        replace: true,
      });
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Inicia sesión" subtitle="Ingresa con tu cuenta asignada.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <div className="relative">
          <label htmlFor="email" className="sr-only">
            Correo electrónico
          </label>
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo electrónico"
            className={authInputClass}
          />
        </div>

        <div className="relative">
          <label htmlFor="password" className="sr-only">
            Contraseña
          </label>
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña"
            className={`${authInputClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-slate-200"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex justify-end">
          <Link to="/recuperar-contrasena" className={`text-xs ${authLinkClass}`}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button type="submit" disabled={submitting} className={authButtonClass}>
          {submitting ? (
            'Ingresando…'
          ) : (
            <>
              Ingresar al sistema
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
