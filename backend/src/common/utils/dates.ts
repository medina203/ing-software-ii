import { BadRequestException } from '@nestjs/common';

/**
 * Zona horaria del negocio. Las fechas de calendario (hoy, vencimientos,
 * días de alquiler) se calculan en esta zona y no en UTC: en Colombia (UTC-5)
 * el día UTC cambia a las 7:00 p. m., lo que marcaba alquileres como vencidos
 * y rechazaba la fecha "hoy" en horario de tarde.
 */
export const DEFAULT_BUSINESS_TIMEZONE = 'America/Bogota';

export function businessTimezone(): string {
  return process.env.APP_TIMEZONE?.trim() || DEFAULT_BUSINESS_TIMEZONE;
}

const MS_PER_DAY = 86_400_000;

/**
 * Convierte una fecha ISO o YYYY-MM-DD en una fecha estable al mediodía UTC,
 * evitando que la zona horaria reste un día al mostrar la fecha.
 */
export function parseDateOnly(value: string): Date {
  const datePart = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    throw new BadRequestException('La fecha suministrada no es válida.');
  }

  const date = new Date(`${datePart}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== datePart) {
    throw new BadRequestException('La fecha suministrada no es válida.');
  }

  return date;
}

/** Día de calendario (YYYY-MM-DD) de un instante en la zona horaria del negocio. */
export function businessDateKey(instant: Date = new Date()): string {
  // en-CA produce el formato YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: businessTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/**
 * Día de calendario del negocio representado como medianoche UTC. Sirve para
 * comparar y contar días sin depender de la hora del servidor.
 */
export function businessDay(instant: Date): Date {
  return new Date(`${businessDateKey(instant)}T00:00:00.000Z`);
}

/** Inicio del día actual del negocio, representado como medianoche UTC. */
export function startOfBusinessToday(): Date {
  return businessDay(new Date());
}

/** Días calendario entre dos instantes según el negocio (puede ser negativo). */
export function businessDaysBetween(start: Date, end: Date): number {
  return Math.round(
    (businessDay(end).getTime() - businessDay(start).getTime()) / MS_PER_DAY,
  );
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** YYYYMMDD del día de negocio del instante indicado. */
export function yyyymmdd(date: Date): string {
  return businessDateKey(date).replaceAll('-', '');
}
