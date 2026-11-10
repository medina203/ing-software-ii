import { BadRequestException } from '@nestjs/common';

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
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('La fecha suministrada no es válida.');
  }

  return date;
}

export function startOfTodayUtc(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function yyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}
