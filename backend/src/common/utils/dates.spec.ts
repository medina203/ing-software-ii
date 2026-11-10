import { BadRequestException } from '@nestjs/common';
import { addDays, parseDateOnly, yyyymmdd } from './dates';

describe('utilidades de fechas', () => {
  it('normaliza una fecha de calendario al mediodía UTC', () => {
    const result = parseDateOnly('2026-11-09');

    expect(result.toISOString()).toBe('2026-11-09T12:00:00.000Z');
  });

  it('rechaza una fecha con formato inválido', () => {
    expect(() => parseDateOnly('09/11/2026')).toThrow(BadRequestException);
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
});
