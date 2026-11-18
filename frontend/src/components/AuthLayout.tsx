import type { ReactNode } from 'react';
import { HardHat } from 'lucide-react';
import { assetUrl } from '../lib/assets';
import { useSettings } from '../lib/settings';

/** Campo oscuro de las pantallas de acceso (con icono a la izquierda). */
export const authInputClass =
  'block h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-white/[0.06] focus:ring-4 focus:ring-brand-500/15';

export const authButtonClass =
  'group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-ink-900 shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60';

export const authLinkClass =
  'font-semibold text-brand-400 underline-offset-4 transition hover:text-brand-300 hover:underline focus:outline-none focus-visible:underline';

export function AuthAlert({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const styles = {
    error: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    info: 'border-white/10 bg-white/[0.04] text-slate-300',
  }[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}
    >
      {children}
    </div>
  );
}

/**
 * Diseño de las pantallas de acceso (login, recuperar y restablecer contraseña):
 * mitad izquierda con la imagen difuminada y la marca, mitad derecha con el contenido.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { settings } = useSettings();
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

      {/* Mitad derecha: contenido */}
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

          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}

          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  );
}
