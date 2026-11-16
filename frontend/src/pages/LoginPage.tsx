import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  HardHat,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { FullPageLoader } from '../components/ui/Feedback';
import { getErrorMessage } from '../lib/api';

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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <section className="relative hidden w-[52%] overflow-hidden bg-ink-900 lg:flex lg:flex-col">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 20%, rgba(245,158,11,.24), transparent 32%), radial-gradient(circle at 82% 72%, rgba(59,130,246,.14), transparent 35%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full border border-brand-400/20" />

        <div className="relative z-10 flex h-full flex-col p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-ink-900 shadow-lg shadow-brand-500/20">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-white">ObraGest</p>
              <p className="text-xs text-slate-400">
                Inventario & alquiler de implementos
              </p>
            </div>
          </div>

          <div className="my-auto max-w-xl py-14">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Control operativo para tu obra
            </p>
            <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-5xl">
              Cada implemento,
              <br />
              <span className="text-brand-400">en el lugar correcto.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-400">
              Administra inventario, alquileres, devoluciones e historial desde un solo
              lugar. Menos planillas, más control.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: PackageCheck,
                  title: 'Disponibilidad',
                  text: 'Validación en tiempo real',
                },
                {
                  icon: ClipboardCheck,
                  title: 'Trazabilidad',
                  text: 'Historial completo',
                },
                {
                  icon: ShieldCheck,
                  title: 'Accesos',
                  text: 'Roles definidos',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm"
                >
                  <feature.icon className="h-5 w-5 text-brand-400" />
                  <p className="mt-3 text-sm font-semibold text-white">{feature.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Sistema de Administración de Inventario y Alquiler · 2026
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-1 flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-ink-900">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-900">ObraGest</p>
              <p className="text-xs text-slate-500">
                Inventario & alquiler de implementos
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
              Bienvenido
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Inicia sesión
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Ingresa con las credenciales asignadas a tu cuenta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="label">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nombre@empresa.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="label">
                Contraseña
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="input px-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-700"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 text-sm font-semibold text-white shadow-lg shadow-ink-900/10 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-700/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                'Ingresando…'
              ) : (
                <>
                  Ingresar al sistema
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Cuentas de demostración
            </p>
            <div className="mt-3 grid gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-left transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <span>
                    <span className="block text-xs font-semibold text-slate-700">
                      {account.role}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {account.email} · {account.password}
                    </span>
                  </span>
                  <span className="text-[11px] font-semibold text-brand-600">Usar</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Sesión protegida con JWT y contraseñas cifradas con bcrypt.
          </p>
        </div>
      </section>
    </div>
  );
}
