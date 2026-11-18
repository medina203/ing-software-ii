import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 leading-5">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-600', className)} />;
}

export function LoadingBlock({
  message = 'Cargando información…',
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
      <Spinner className="h-7 w-7" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-brand-400 shadow-lg">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Preparando DM alquiler…</p>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'slate',
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: 'slate' | 'emerald' | 'blue' | 'amber' | 'rose';
  /** Si se indica, la tarjeta es clicable (lleva al detalle). */
  onClick?: () => void;
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
  };

  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'card group w-full p-5 text-left transition duration-200',
        onClick &&
          'hover:-translate-y-0.5 hover:shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </div>
        <div
          className={cn(
            'rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
            tones[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Wrapper>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('card overflow-hidden', className)}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  loading,
  confirmLabel = 'Confirmar',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
  confirmLabel?: string;
}) {
  return (
    <ModalShell open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/55 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop animate-slide-up"
      >
        <h2
          id="confirm-title"
          className="text-lg font-bold tracking-tight text-slate-900"
        >
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
