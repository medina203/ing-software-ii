import { describe, expect, it } from 'vitest';
import { formatDateOnly, formatMoney, initials, itemStatusLabels } from './format';

describe('utilidades de formato', () => {
  it('genera las iniciales de un nombre', () => {
    expect(initials('Daniel Administrador')).toBe('DA');
    expect(initials('  Ana   María Gómez  ')).toBe('AM');
  });

  it('formatea un valor monetario en COP', () => {
    const formatted = formatMoney(1500);

    expect(formatted).toContain('1.500');
  });

  it('formatea una fecha de calendario sin desfase de zona horaria', () => {
    const formatted = formatDateOnly('2026-11-09');

    expect(formatted).toContain('09');
    expect(formatted.toLowerCase()).toContain('nov');
  });

  it('expone las etiquetas de estado del inventario', () => {
    expect(itemStatusLabels.DISPONIBLE).toBe('Disponible');
    expect(itemStatusLabels.ALQUILADO).toBe('Alquilado');
  });
});
