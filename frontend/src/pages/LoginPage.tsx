import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, HardHat, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { FullPageLoader } from '../components/ui/Feedback';
import { getErrorMessage } from '../lib/api';
import { assetUrl } from '../lib/assets';
import { useSettings } from '../lib/settings';

const darkInput =
  'block h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-white/[0.06] focus:ring-4 focus:ring-brand-500/15';

const demoAccounts = [
  {
    role: 'Administrador',
    email: 'admin@obragest.local',
    password: 'Admin123*',
  },
  {
    role: 'Empleado',
    email: 'empleado@obragest.local',
    password: 'Empleado123*',
  },
];

export function LoginPage() {
  const { usuario, loading, login } = useAuth();
  const { settings } = useSettings();
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

  const fillDemo = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  const background =
    assetUrl(settings.imagenLoginUrl) ?? '/ilustraciones/login-fondo.svg';

  return (
    <div className="theme-fixed flex min-h-screen bg-[#0d1016] text-slate-300">
      {/* Mitad izquierda: imagen difuminada con la marca */}
      <section className="relative hidden w-1/2 overflow-hidden lg:block" aria-hidden>
        <img
          src={background}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[3px] brightness-[0.55]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1016]/80 via-[#0d1016]/30 to-[#0d1016]" />
        <div className="absolute -right-24 top-0 h-full w-40 -skew-x-[18deg] bg-brand-500/85" />
        <div className="absolute -right-4 top-0 h-full w-6 -skew-x-[18deg] bg-brand-400/40" />

        <svg
          viewBox="0 0 300 200"
          className="absolute left-10 top-1/2 w-[62%] max-w-xl -translate-y-1/2"
        >
          <text
            x="0"
            y="165"
            fill="none"
            stroke="rgb(var(--brand-400))"
            strokeOpacity="0.75"
            strokeWidth="1.2"
            fontSize="190"
            fontWeight="900"
            fontFamily="Inter, system-ui, sans-serif"
            letterSpacing="-12"
          >
            DM
          </text>
        </svg>

        <div className="absolute bottom-10 left-10 right-40">
          <p className="text-3xl font-bold leading-tight text-white xl:text-4xl">
            Equipos listos
            <br />
            <span className="text-brand-400">para tu obra.</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-slate-400">
            Inventario, alquileres y cartera en un solo lugar.
          </p>
        </div>
      </section>

      {/* Mitad derecha: formulario */}
      <section className="flex min-h-screen flex-1 items-center justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-ink-900 shadow-lg shadow-brand-500/20">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-white">DM alquiler</p>
              <p className="text-xs text-slate-500">Inventario & alquiler</p>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">Inicia sesión</h1>
          <p className="mt-2 text-sm text-slate-500">Ingresa con tu cuenta asignada.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              >
                {error}
              </div>
            )}

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
                className={darkInput}
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
                className={`${darkInput} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-slate-200"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-ink-900 shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
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

          <details className="mt-8 text-xs text-slate-500">
            <summary className="cursor-pointer select-none font-semibold hover:text-slate-300">
              Cuentas de demostración
            </summary>
            <div className="mt-3 grid gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left transition hover:border-brand-500/50 hover:bg-white/5"
                >
                  <span className="text-slate-300">{account.role}</span>
                  <span className="font-semibold text-brand-400">Usar</span>
                </button>
              ))}
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
