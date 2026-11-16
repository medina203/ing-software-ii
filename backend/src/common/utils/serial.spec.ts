import {
  extractSerialConsecutive,
  formatSerial,
  isValidSerialPrefix,
  normalizeSerialPrefix,
} from './serial';

describe('seriales automáticos', () => {
  it('normaliza el prefijo a mayúsculas y sin espacios extremos', () => {
    expect(normalizeSerialPrefix('  herr  ')).toBe('HERR');
  });

  it('valida prefijos alfanuméricos que inician con letra', () => {
    expect(isValidSerialPrefix('HERR')).toBe(true);
    expect(isValidSerialPrefix('and')).toBe(true);
    expect(isValidSerialPrefix('CAT01')).toBe(true);
    expect(isValidSerialPrefix('H')).toBe(false);
    expect(isValidSerialPrefix('1HERR')).toBe(false);
    expect(isValidSerialPrefix('HERR-')).toBe(false);
    expect(isValidSerialPrefix('HERR_1')).toBe(false);
    expect(isValidSerialPrefix('PREFIJODEMASIADOLARGO')).toBe(false);
  });

  it('genera el formato PREFIJO-### con mínimo tres dígitos', () => {
    expect(formatSerial('HERR', 4)).toBe('HERR-004');
    expect(formatSerial('and', 27)).toBe('AND-027');
    expect(formatSerial('MAQ', 999)).toBe('MAQ-999');
    expect(formatSerial('MAQ', 1000)).toBe('MAQ-1000');
  });

  it('rechaza consecutivos inválidos', () => {
    expect(() => formatSerial('HERR', 0)).toThrow(
      'El consecutivo del serial debe ser un entero positivo.',
    );
    expect(() => formatSerial('HERR', 1.5)).toThrow(
      'El consecutivo del serial debe ser un entero positivo.',
    );
  });

  it('extrae el consecutivo solo cuando el serial corresponde al prefijo', () => {
    expect(extractSerialConsecutive('HERR-004', 'HERR')).toBe(4);
    expect(extractSerialConsecutive('herr-010', 'HERR')).toBe(10);
    expect(extractSerialConsecutive('HERR-000', 'HERR')).toBe(0);
    expect(extractSerialConsecutive('HERR-004-EXTRA', 'HERR')).toBeNull();
    expect(extractSerialConsecutive('MAQ-004', 'HERR')).toBeNull();
    expect(extractSerialConsecutive('CAT-ASFDASD-02', 'HERR')).toBeNull();
  });
});
