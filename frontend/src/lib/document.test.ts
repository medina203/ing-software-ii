import { describe, expect, it } from 'vitest';
import {
  buildDocument,
  parseDocument,
  validateDocument,
  validatePhone,
} from './document';

describe('documento de identidad y teléfono', () => {
  it('separa y vuelve a armar los formatos existentes', () => {
    expect(parseDocument('CC-10324567')).toEqual({
      tipo: 'CC',
      numero: '10324567',
      dv: '',
    });
    expect(parseDocument('NIT-900123456-7')).toEqual({
      tipo: 'NIT',
      numero: '900123456',
      dv: '7',
    });
    expect(buildDocument({ tipo: 'NIT', numero: '900123456', dv: '7' })).toBe(
      'NIT-900123456-7',
    );
    expect(buildDocument({ tipo: 'CE', numero: '7845123', dv: '' })).toBe('CE-7845123');
  });

  it('valida la cantidad de dígitos según el tipo', () => {
    expect(validateDocument({ tipo: 'CC', numero: '12345', dv: '' })).toMatch(
      /entre 6 y 10/,
    );
    expect(validateDocument({ tipo: 'CC', numero: '1032456789', dv: '' })).toBe('');
    expect(validateDocument({ tipo: 'NIT', numero: '90012345', dv: '7' })).toMatch(
      /9 dígitos/,
    );
    expect(validateDocument({ tipo: 'NIT', numero: '900123456', dv: '' })).toMatch(
      /verificación/,
    );
  });

  it('valida el teléfono', () => {
    expect(validatePhone('3105551234')).toBe('');
    expect(validatePhone('310555')).not.toBe('');
    expect(validatePhone('31055512345')).not.toBe('');
  });
});
