import { BadRequestException, HttpException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { issuedBeforeReset } from '../common/guards/jwt-auth.guard';
import { publicAppUrl } from '../common/config/app-url';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginAttemptsService } from './login-attempts.service';
import { passwordResetEmail } from './password-reset-email';
import {
  GENERIC_REQUEST_MESSAGE,
  INVALID_LINK_MESSAGE,
  PasswordResetService,
  hashResetToken,
} from './password-reset.service';

const NOW = new Date('2026-11-18T15:00:00Z');
const activeUser = { id: 7, nombre: 'Ana', email: 'ana@negocio.com', activo: true };

function setup(
  options: {
    user?: typeof activeUser | null;
    token?: Record<string, unknown> | null;
  } = {},
) {
  const tx = {
    tokenRecuperacion: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    usuario: { update: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    usuario: {
      findUnique: jest
        .fn()
        .mockResolvedValue(options.user === undefined ? activeUser : options.user),
    },
    tokenRecuperacion: {
      deleteMany: jest.fn().mockReturnValue('delete-op'),
      create: jest.fn().mockReturnValue('create-op'),
      findUnique: jest.fn().mockResolvedValue(options.token ?? null),
    },
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : arg,
    ),
  };
  const mail = {
    send: jest.fn().mockResolvedValue(true),
    isAvailable: jest.fn().mockReturnValue(true),
  };
  const loginAttempts = { registerSuccess: jest.fn() };
  const service = new PasswordResetService(
    prisma as unknown as PrismaService,
    mail as unknown as MailService,
    loginAttempts as unknown as LoginAttemptsService,
  );
  return { service, prisma, mail, loginAttempts, tx };
}

function validToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    usuarioId: activeUser.id,
    expiraEn: new Date(NOW.getTime() + 10 * 60_000),
    usadoEn: null,
    usuario: { email: activeUser.email, activo: true },
    ...overrides,
  };
}

describe('PasswordResetService.requestReset', () => {
  it('crea un token, guarda solo su hash y envía el enlace al correo', async () => {
    const { service, prisma, mail } = setup();
    const result = await service.requestReset('ana@negocio.com', '1.1.1.1', NOW);

    expect(result.message).toBe(GENERIC_REQUEST_MESSAGE);
    const data = prisma.tokenRecuperacion.create.mock.calls[0][0].data;
    expect(data.usuarioId).toBe(7);
    expect(data.expiraEn).toEqual(new Date(NOW.getTime() + 30 * 60_000));

    const message = mail.send.mock.calls[0][0];
    expect(message.to).toBe('ana@negocio.com');
    const token = decodeURIComponent(/token=([^\s"&<]+)/.exec(message.text)![1]);
    expect(token).toHaveLength(43);
    expect(data.tokenHash).toBe(hashResetToken(token));
    expect(data.tokenHash).not.toContain(token);
    expect(message.text).toContain('/restablecer-contrasena?token=');
  });

  it('invalida los enlaces anteriores sin usar del mismo usuario', async () => {
    const { service, prisma } = setup();
    await service.requestReset('ana@negocio.com', '1.1.1.1', NOW);
    expect(prisma.tokenRecuperacion.deleteMany).toHaveBeenCalledWith({
      where: { usuarioId: 7, usadoEn: null },
    });
  });

  it('responde lo mismo si la cuenta no existe o está inactiva, sin enviar correo', async () => {
    for (const user of [null, { ...activeUser, activo: false }]) {
      const { service, mail, prisma } = setup({ user });
      const result = await service.requestReset('nadie@negocio.com', '1.1.1.1', NOW);
      expect(result.message).toBe(GENERIC_REQUEST_MESSAGE);
      expect(mail.send).not.toHaveBeenCalled();
      expect(prisma.tokenRecuperacion.create).not.toHaveBeenCalled();
    }
  });

  it('limita a 3 correos por cuenta cada 15 minutos sin revelarlo', async () => {
    const { service, mail } = setup();
    for (let i = 0; i < 5; i += 1) {
      const result = await service.requestReset('ana@negocio.com', `10.0.0.${i}`, NOW);
      expect(result.message).toBe(GENERIC_REQUEST_MESSAGE);
    }
    expect(mail.send).toHaveBeenCalledTimes(3);
  });

  it('responde 429 tras 10 solicitudes desde la misma IP', async () => {
    const { service } = setup({ user: null });
    for (let i = 0; i < 10; i += 1) {
      await service.requestReset(`u${i}@negocio.com`, '9.9.9.9', NOW);
    }
    await expect(
      service.requestReset('otro@negocio.com', '9.9.9.9', NOW),
    ).rejects.toBeInstanceOf(HttpException);
  });
});

describe('PasswordResetService.resetPassword', () => {
  it('cambia la contraseña, marca el enlace como usado y cierra sesiones anteriores', async () => {
    const { service, tx, loginAttempts, prisma } = setup({ token: validToken() });
    const result = await service.resetPassword('t'.repeat(43), 'NuevaClave2026', NOW);

    expect(result.message).toContain('restablecida');
    expect(prisma.tokenRecuperacion.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashResetToken('t'.repeat(43)) } }),
    );
    expect(tx.tokenRecuperacion.updateMany).toHaveBeenCalledWith({
      where: { id: 1, usadoEn: null },
      data: { usadoEn: NOW },
    });
    const update = tx.usuario.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 7 });
    expect(update.data.passwordRestablecidaEn).toEqual(NOW);
    expect(await bcrypt.compare('NuevaClave2026', update.data.passwordHash)).toBe(true);
    expect(loginAttempts.registerSuccess).toHaveBeenCalledWith([
      'login:email:ana@negocio.com',
    ]);
  });

  it.each([
    ['inexistente', null],
    ['vencido', validToken({ expiraEn: new Date(NOW.getTime() - 1) })],
    ['ya usado', validToken({ usadoEn: new Date(NOW.getTime() - 60_000) })],
    [
      'de un usuario inactivo',
      validToken({ usuario: { email: 'ana@negocio.com', activo: false } }),
    ],
  ])('rechaza un enlace %s', async (_label, token) => {
    const { service, tx } = setup({ token });
    await expect(
      service.resetPassword('t'.repeat(43), 'NuevaClave2026', NOW),
    ).rejects.toThrow(INVALID_LINK_MESSAGE);
    expect(tx.usuario.update).not.toHaveBeenCalled();
  });

  it('rechaza el segundo uso simultáneo del mismo enlace', async () => {
    const { service, tx } = setup({ token: validToken() });
    tx.tokenRecuperacion.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.resetPassword('t'.repeat(43), 'NuevaClave2026', NOW),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.usuario.update).not.toHaveBeenCalled();
  });

  it('validateToken no consulta la base con tokens de longitud imposible', async () => {
    const { service, prisma } = setup();
    await expect(service.validateToken('corto', NOW)).resolves.toEqual({ valido: false });
    expect(prisma.tokenRecuperacion.findUnique).not.toHaveBeenCalled();
  });
});

describe('cierre de sesiones tras restablecer', () => {
  const reset = new Date('2026-11-18T15:00:00.700Z');
  it('rechaza tokens emitidos antes del restablecimiento', () => {
    expect(issuedBeforeReset(Math.floor(reset.getTime() / 1000) - 1, reset)).toBe(true);
    expect(issuedBeforeReset(undefined, reset)).toBe(true);
  });
  it('acepta tokens emitidos después o sin restablecimiento', () => {
    expect(issuedBeforeReset(Math.floor(reset.getTime() / 1000), reset)).toBe(false);
    expect(issuedBeforeReset(123, null)).toBe(false);
  });
});

describe('MailService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  const message = { to: 'a@b.co', subject: 'Hola', html: '<p>x</p>', text: 'x' };

  it('en producción sin RESEND_API_KEY no envía y no está disponible', async () => {
    const mail = new MailService({ NODE_ENV: 'production' } as NodeJS.ProcessEnv);
    global.fetch = jest.fn();
    expect(mail.isAvailable()).toBe(false);
    await expect(mail.send(message)).resolves.toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('en desarrollo sin clave escribe el correo en la consola', async () => {
    const mail = new MailService({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(mail.isAvailable()).toBe(true);
    await expect(mail.send(message)).resolves.toBe(true);
  });

  it('con RESEND_API_KEY llama a la API de Resend con el remitente configurado', async () => {
    const mail = new MailService({
      NODE_ENV: 'production',
      RESEND_API_KEY: 're_prueba',
      MAIL_FROM: 'DM alquiler <no-responder@dmalquiler.com>',
    } as NodeJS.ProcessEnv);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(mail.send(message)).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_prueba');
    expect(JSON.parse(init.body)).toMatchObject({
      from: 'DM alquiler <no-responder@dmalquiler.com>',
      to: ['a@b.co'],
      subject: 'Hola',
    });
  });

  it('si Resend falla devuelve false sin lanzar error', async () => {
    const mail = new MailService({ RESEND_API_KEY: 're_x' } as NodeJS.ProcessEnv);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'domain not verified',
    }) as unknown as typeof fetch;
    await expect(mail.send(message)).resolves.toBe(false);
  });
});

describe('correo y enlaces', () => {
  it('escapa el nombre del usuario en el HTML', () => {
    const email = passwordResetEmail({
      to: 'a@b.co',
      nombre: '<script>x</script>',
      link: 'https://sitio/restablecer-contrasena?token=abc',
      minutes: 30,
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.text).toContain('30 minutos');
  });

  it('la dirección pública nunca viene de la petición', () => {
    expect(publicAppUrl({ APP_URL: 'https://mi.app/' } as NodeJS.ProcessEnv)).toBe(
      'https://mi.app',
    );
    expect(
      publicAppUrl({ RAILWAY_PUBLIC_DOMAIN: 'x.up.railway.app' } as NodeJS.ProcessEnv),
    ).toBe('https://x.up.railway.app');
    expect(
      publicAppUrl({ FRONTEND_URL: 'http://a:5173,http://b' } as NodeJS.ProcessEnv),
    ).toBe('http://a:5173');
    expect(publicAppUrl({} as NodeJS.ProcessEnv)).toBe('http://localhost:5173');
  });
});
