import { normalizeSearchTerm } from './search';

describe('normalizeSearchTerm', () => {
  it('elimina espacios extremos y colapsa espacios internos', () => {
    expect(normalizeSearchTerm('  Carlos   Andrés  ')).toBe('Carlos Andrés');
  });

  it('devuelve undefined para valores vacíos', () => {
    expect(normalizeSearchTerm('')).toBeUndefined();
    expect(normalizeSearchTerm('   ')).toBeUndefined();
    expect(normalizeSearchTerm(undefined)).toBeUndefined();
    expect(normalizeSearchTerm(null)).toBeUndefined();
  });
});
