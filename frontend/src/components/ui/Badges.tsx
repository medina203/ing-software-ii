import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'purple' | 'sky';

const toneStyles: Record<Tone, string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
  purple: 'border-purple-200 bg-purple-50 text-purple-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
};

const dotStyles: Record<Tone, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
  purple: 'bg-purple-500',
  sky: 'bg-sky-500',
};

export function Badge({
  children,
  tone = 'slate',
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide',
        toneStyles[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[tone])} />}
      {children}
    </span>
  );
}

export function ItemStatusBadge({
  status,
}: {
  status: 'DISPONIBLE' | 'ALQUILADO' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO';
}) {
  const config = {
    DISPONIBLE: { tone: 'emerald' as const, label: 'Disponible' },
    ALQUILADO: { tone: 'blue' as const, label: 'Alquilado' },
    MANTENIMIENTO: { tone: 'amber' as const, label: 'Mantenimiento' },
    FUERA_DE_SERVICIO: { tone: 'rose' as const, label: 'Fuera de servicio' },
  }[status];

  return (
    <Badge tone={config.tone} dot>
      {config.label}
    </Badge>
  );
}

export function RentalStatusBadge({
  status,
}: {
  status: 'ACTIVO' | 'FINALIZADO' | 'VENCIDO';
}) {
  const config = {
    ACTIVO: { tone: 'sky' as const, label: 'Activo' },
    FINALIZADO: { tone: 'emerald' as const, label: 'Finalizado' },
    VENCIDO: { tone: 'rose' as const, label: 'Vencido' },
  }[status];

  return (
    <Badge tone={config.tone} dot>
      {config.label}
    </Badge>
  );
}

export function DeliveryStatusBadge({
  status,
}: {
  status: 'DISPONIBLE' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO';
}) {
  const config = {
    DISPONIBLE: { tone: 'emerald' as const, label: 'Disponible' },
    MANTENIMIENTO: { tone: 'amber' as const, label: 'Mantenimiento' },
    FUERA_DE_SERVICIO: { tone: 'rose' as const, label: 'Fuera de servicio' },
  }[status];

  return <Badge tone={config.tone}>{config.label}</Badge>;
}

export function InvoiceStatusBadge({
  status,
}: {
  status: 'PENDIENTE' | 'PAGADA' | 'VENCIDA';
}) {
  const config = {
    PENDIENTE: { tone: 'amber' as const, label: 'Pendiente' },
    PAGADA: { tone: 'emerald' as const, label: 'Pagada' },
    VENCIDA: { tone: 'rose' as const, label: 'Vencida' },
  }[status];

  return (
    <Badge tone={config.tone} dot>
      {config.label}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: 'ADMIN' | 'EMPLEADO' }) {
  return role === 'ADMIN' ? (
    <Badge tone="purple">Administrador</Badge>
  ) : (
    <Badge tone="slate">Empleado</Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? 'emerald' : 'slate'} dot>
      {active ? 'Activo' : 'Inactivo'}
    </Badge>
  );
}
