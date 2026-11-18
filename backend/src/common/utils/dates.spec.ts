import { BadRequestException } from '@nestjs/common';
import {
  addDays,
  businessDateKey,
  businessDaysBetween,
  parseDateOnly,
  startOfBusinessToday,
  yyyymmdd,
} from './dates';

describe('utilidades de fechas', () => {
  const originalTz = process.env.APP_TIMEZONE;

  afterEach(() => {
    jest.useRealTimers();
    if (originalTz === undefined) delete process.env.APP_TIMEZONE;
    else process.env.APP_TIMEZONE = originalTz;
  });

  it('normaliza una fecha de calendario al mediodía UTC', () => {
    const result = parseDateOnly('2026-11-09');

    expect(result.toISOString()).toBe('2026-11-09T12:00:00.000Z');
  });

  it('rechaza una fecha con formato inválido', () => {
    expect(() => parseDateOnly('09/11/2026')).toThrow(BadRequestException);
  });

  it('rechaza una fecha inexistente en lugar de desplazarla', () => {
    expect(() => parseDateOnly('2026-02-30')).toThrow(BadRequestException);
  });

  it('suma días sin modificar la fecha original', () => {
    const original = new Date('2026-11-09T12:00:00.000Z');
    const result = addDays(original, 5);

    expect(result.toISOString()).toBe('2026-11-14T12:00:00.000Z');
    expect(original.toISOString()).toBe('2026-11-09T12:00:00.000Z');
  });

  it('genera el formato YYYYMMDD', () => {
    expect(yyyymmdd(new Date('2026-11-09T12:00:00.000Z'))).toBe('20261109');
  });

  describe('zona horaria del negocio (America/Bogota por defecto)', () => {
    it('a las 8:00 p. m. en Bogotá el día sigue siendo el mismo aunque en UTC ya cambió', () => {
      delete process.env.APP_TIMEZONE;
      jest.useFakeTimers().setSystemTime(new Date('2026-11-18T01:00:00.000Z'));

      expect(businessDateKey()).toBe('2026-11-17');
      expect(startOfBusinessToday().toISOString()).toBe('2026-11-17T00:00:00.000Z');
    });

    it('una devolución pactada para hoy no queda en el pasado en horario de tarde', () => {
      delete process.env.APP_TIMEZONE;
      jest.useFakeTimers().setSystemTime(new Date('2026-11-18T01:00:00.000Z'));

      expect(parseDateOnly('2026-11-17') < startOfBusinessToday()).toBe(false);
    });

    it('cuenta días calendario del negocio entre dos instantes', () => {
      delete process.env.APP_TIMEZONE;
      // 17 nov 8 p. m. Bogotá → 20 nov 10 a. m. Bogotá = 3 días.
      const start = new Date('2026-11-18T01:00:00.000Z');
      const end = new Date('2026-11-20T15:00:00.000Z');

      expect(businessDaysBetween(start, end)).toBe(3);
    });

    it('respeta APP_TIMEZONE cuando se configura', () => {
      process.env.APP_TIMEZONE = 'UTC';
      expect(businessDateKey(new Date('2026-11-18T01:00:00.000Z'))).toBe('2026-11-18');
    });
  });
});
