import { describe, expect, it } from 'vitest';
import type { Client } from '../types';
import { clientFullName, clientOptionLabel, normalizeClientSearch } from './clients';

const client: Client = {
  id: 1,
  documentoIdentidad: 'CC-10324567',
  nombres: 'Carlos Andrés',
  apellidos: 'Gómez Ruiz',
  telefono: '3105551234',
  correo: 'carlos.gomez@example.com',
  direccion: 'Calle 45 # 12-30',
};

describe('utilidades de clientes', () => {
  it('compone el nombre completo y la etiqueta de la opción', () => {
    expect(clientFullName(client)).toBe('Carlos Andrés Gómez Ruiz');
    expect(clientOptionLabel(client)).toBe('CC-10324567 · Carlos Andrés Gómez Ruiz');
  });

  it('normaliza espacios del término de búsqueda', () => {
    expect(normalizeClientSearch('  Carlos   Andrés  ')).toBe('Carlos Andrés');
    expect(normalizeClientSearch('   ')).toBe('');
  });
});
