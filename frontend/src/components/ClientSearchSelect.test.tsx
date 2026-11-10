import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import api from '../lib/api';
import type { Client } from '../types';
import { ClientSearchSelect } from './ClientSearchSelect';

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
  getErrorMessage: vi.fn(() => 'No fue posible cargar los clientes.'),
}));

const client: Client = {
  id: 1,
  documentoIdentidad: 'CC-10324567',
  nombres: 'Carlos Andrés',
  apellidos: 'Gómez Ruiz',
  telefono: '3105551234',
  correo: 'carlos.gomez@example.com',
  direccion: 'Calle 45 # 12-30',
};

const mockedGet = vi.mocked(api.get);

function renderSelect(value: Client | null = null, onChange = vi.fn()) {
  render(
    <MemoryRouter>
      <ClientSearchSelect id="cliente" value={value} onChange={onChange} />
    </MemoryRouter>,
  );

  return { onChange };
}

afterEach(() => {
  cleanup();
  mockedGet.mockReset();
});

describe('ClientSearchSelect', () => {
  it('busca con debounce y selecciona un cliente con el teclado', async () => {
    mockedGet.mockResolvedValue({
      data: { data: [client], total: 1 },
    } as never);
    const user = userEvent.setup();
    const { onChange } = renderSelect();

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'Gómez');

    await waitFor(() => {
      expect(mockedGet).toHaveBeenLastCalledWith('/clients', {
        params: { limit: 8, search: 'Gómez' },
      });
    });

    const option = await screen.findByRole('option', {
      name: 'CC-10324567 · Carlos Andrés Gómez Ruiz',
    });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith(client);
  });

  it('muestra el cliente seleccionado y permite cambiarlo', async () => {
    mockedGet.mockResolvedValue({
      data: { data: [], total: 0 },
    } as never);
    const user = userEvent.setup();
    const { onChange } = renderSelect(client);

    expect(screen.getByLabelText('Cliente seleccionado')).toHaveValue(
      'CC-10324567 · Carlos Andrés Gómez Ruiz',
    );

    await user.click(screen.getByRole('button', { name: 'Cambiar' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
