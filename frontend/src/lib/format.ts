import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { DeliveryStatus, ItemStatus, RentalStatus, UserRole } from '../types';

const moneyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

export function formatMoney(value: string | number): string {
  return moneyFormatter.format(Number(value));
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = parse(value);
  return date ? format(date, 'dd MMM yyyy', { locale: es }) : '—';
}

export function formatDateLong(value: string | Date | null | undefined): string {
  const date = parse(value);
  return date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : '—';
}

/**
 * Formatea una fecha de calendario sin aplicar conversión de zona horaria.
 * Útil para fechas de corte que se almacenan como ISO a medianoche UTC.
 */
export function formatDateOnly(value: string | Date | null | undefined): string {
  if (!value) return '—';

  if (typeof value === 'string') {
    const datePart = /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0];
    if (datePart) {
      const date = new Date(`${datePart}T12:00:00`);
      return isValid(date) ? format(date, 'dd MMM yyyy', { locale: es }) : '—';
    }
  }

  return formatDate(value);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = parse(value);
  return date ? format(date, 'dd MMM yyyy · HH:mm', { locale: es }) : '—';
}

export function todayInputDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function daysOverdue(value: string | Date): number {
  const due = parse(value);
  if (!due) return 0;
  return Math.max(0, differenceInCalendarDays(startOfDay(new Date()), startOfDay(due)));
}

export function daysUntil(value: string | Date): number {
  const due = parse(value);
  if (!due) return 0;
  return differenceInCalendarDays(startOfDay(due), startOfDay(new Date()));
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export const itemStatusLabels: Record<ItemStatus, string> = {
  DISPONIBLE: 'Disponible',
  ALQUILADO: 'Alquilado',
  MANTENIMIENTO: 'Mantenimiento',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

export const rentalStatusLabels: Record<RentalStatus, string> = {
  ACTIVO: 'Activo',
  FINALIZADO: 'Finalizado',
  VENCIDO: 'Vencido',
};

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  DISPONIBLE: 'Disponible',
  MANTENIMIENTO: 'Mantenimiento',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  EMPLEADO: 'Empleado',
};
