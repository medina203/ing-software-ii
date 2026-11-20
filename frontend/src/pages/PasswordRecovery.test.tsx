import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../lib/api';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { LoginPage } from './LoginPage';
import { ResetPasswordPage, newPasswordError } from './ResetPasswordPage';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  getErrorMessage: vi.fn((error: { message?: string }) => error?.message ?? 'Error'),
}));
vi.mock('../lib/settings', () => ({
  useSettings: () => ({ settings: { imagenLoginUrl: null } }),
}));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ usuario: null, loading: false, login: vi.fn() }),
}));

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
        <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  mockedGet.mockReset();
  mockedPost.mockReset();
});

describe('LoginPage', () => {
  it('no muestra cuentas de demostración y enlaza a la recuperación', async () => {
    mockedGet.mockResolvedValue({ data: { correoDisponible: true } });
    renderAt('/login');
    expect(screen.queryByText(/demostración/i)).toBeNull();
    expect(screen.queryByText(/obragest\.local/i)).toBeNull();

    await userEvent.click(
      screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Recupera tu contraseña' }),
    ).toBeInTheDocument();
  });
});

describe('ForgotPasswordPage', () => {
  it('envía el correo y muestra el mensaje genérico del servidor', async () => {
    mockedGet.mockResolvedValue({ data: { correoDisponible: true } });
    mockedPost.mockResolvedValue({
      data: { message: 'Si el correo pertenece a una cuenta…' },
    });
    renderAt('/recuperar-contrasena');

    await userEvent.type(
      screen.getByPlaceholderText('Correo electrónico'),
      ' ana@negocio.com ',
    );
    await userEvent.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(mockedPost).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'ana@negocio.com',
    });
    expect(
      await screen.findByRole('heading', { name: 'Revisa tu correo' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Si el correo pertenece a una cuenta…')).toBeInTheDocument();
    // Si el correo no llega (p. ej. Resend sin dominio), se indica la alternativa.
    expect(
      screen.getByText(/pide al administrador que te asigne una contraseña nueva/i),
    ).toBeInTheDocument();
  });

  it('si el correo no está configurado indica pedir la contraseña al administrador', async () => {
    mockedGet.mockResolvedValue({ data: { correoDisponible: false } });
    renderAt('/recuperar-contrasena');
    expect(await screen.findByText(/todavía no está activada/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Correo electrónico')).toBeNull();
  });
});

describe('ResetPasswordPage', () => {
  it('sin token muestra que el enlace no es válido', () => {
    renderAt('/restablecer-contrasena');
    expect(screen.getByRole('heading', { name: 'Enlace no válido' })).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('con un token vencido ofrece pedir uno nuevo', async () => {
    mockedGet.mockResolvedValue({ data: { valido: false } });
    renderAt('/restablecer-contrasena?token=abc123abc123abc123abc123');
    expect(
      await screen.findByRole('link', { name: 'Pedir un enlace nuevo' }),
    ).toBeInTheDocument();
  });

  it('valida la confirmación y guarda la contraseña nueva', async () => {
    const token = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
    mockedGet.mockResolvedValue({ data: { valido: true } });
    mockedPost.mockResolvedValue({ data: { message: 'ok' } });
    renderAt(`/restablecer-contrasena?token=${token}`);

    await screen.findByRole('heading', { name: 'Crea una contraseña nueva' });
    expect(mockedGet).toHaveBeenCalledWith('/auth/reset-password/validate', {
      params: { token },
    });

    await userEvent.type(
      screen.getByPlaceholderText('Nueva contraseña'),
      'ClaveNueva2026',
    );
    await userEvent.type(
      screen.getByPlaceholderText('Confirmar contraseña'),
      'Distinta2026',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByPlaceholderText('Confirmar contraseña'));
    await userEvent.type(
      screen.getByPlaceholderText('Confirmar contraseña'),
      'ClaveNueva2026',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/auth/reset-password', {
        token,
        newPassword: 'ClaveNueva2026',
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Contraseña actualizada' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('newPasswordError aplica las mismas reglas que el servidor', () => {
    expect(newPasswordError('corta', 'corta')).toMatch(/al menos 8/);
    expect(newPasswordError('x'.repeat(73), 'x'.repeat(73))).toMatch(/72/);
    expect(newPasswordError('ClaveNueva', 'ClaveNuev')).toBe(
      'Las contraseñas no coinciden.',
    );
    expect(newPasswordError('ClaveNueva', 'ClaveNueva')).toBe('');
  });
});
