import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordResetService } from '../src/auth/password-reset.service';
import { MailMessage, MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** RF-22: recuperación de contraseña por enlace de un solo uso. */
describe('Recuperación de contraseña (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  const sent: MailMessage[] = [];
  const stamp = Date.now().toString(36);
  const email = `recupera.${stamp}@prueba.local`;
  const oldPassword = 'ClaveVieja2026';
  const newPassword = 'ClaveNueva2026';
  const server = () => app.getHttpServer();

  const tokenFrom = (message: MailMessage) =>
    decodeURIComponent(/token=([A-Za-z0-9_\-%]+)/.exec(message.text)![1]);

  const requestLink = async () => {
    await request(server()).post('/api/auth/forgot-password').send({ email }).expect(200);
    return tokenFrom(sent[sent.length - 1]);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({
        isAvailable: () => true,
        isConfigured: () => true,
        send: async (message: MailMessage) => {
          sent.push(message);
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const user = await prisma.usuario.create({
      data: {
        nombre: 'Usuario Recuperación',
        email,
        passwordHash: await bcrypt.hash(oldPassword, 10),
        rol: Rol.EMPLEADO,
      },
    });
    userId = user.id;
  });

  beforeEach(() => app.get(PasswordResetService).resetLimits());

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('informa al frontend que la recuperación por correo está disponible', async () => {
    const res = await request(server()).get('/api/auth/password-recovery').expect(200);
    expect(res.body).toEqual({ correoDisponible: true });
  });

  it('responde igual para un correo inexistente y no envía nada', async () => {
    const before = sent.length;
    const res = await request(server())
      .post('/api/auth/forgot-password')
      .send({ email: `nadie.${stamp}@prueba.local` })
      .expect(200);
    expect(res.body.message).toContain('Si el correo pertenece');
    expect(sent.length).toBe(before);
  });

  it('valida el correo de la solicitud', async () => {
    await request(server())
      .post('/api/auth/forgot-password')
      .send({ email: 'no-es-correo' })
      .expect(400);
  });

  it('restablece con el enlace, cierra sesiones viejas y el enlace no se puede reutilizar', async () => {
    const oldSession = await request(server())
      .post('/api/auth/login')
      .send({ email, password: oldPassword })
      .expect(200);
    const oldToken = oldSession.body.accessToken as string;

    // Normaliza el correo (mayúsculas y espacios) igual que el login.
    await request(server())
      .post('/api/auth/forgot-password')
      .send({ email: `  ${email.toUpperCase()} ` })
      .expect(200);
    const message = sent[sent.length - 1];
    expect(message.to).toBe(email);
    expect(message.subject).toMatch(
      /^Restablece tu contraseña de DM alquiler \(\d{1,2}:\d{2} [ap]\. m\.\)$/,
    );
    const token = tokenFrom(message);

    const stored = await prisma.tokenRecuperacion.findMany({
      where: { usuarioId: userId },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0].tokenHash).not.toBe(token);

    await request(server())
      .get('/api/auth/reset-password/validate')
      .query({ token })
      .expect(200, { valido: true });

    // Espera a cambiar de segundo para que la sesión vieja quede claramente antes.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await request(server())
      .post('/api/auth/reset-password')
      .send({ token, newPassword })
      .expect(200);

    await request(server())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`)
      .expect(401);
    await request(server())
      .post('/api/auth/login')
      .send({ email, password: oldPassword })
      .expect(401);
    await request(server())
      .post('/api/auth/login')
      .send({ email, password: newPassword })
      .expect(200);

    await request(server())
      .get('/api/auth/reset-password/validate')
      .query({ token })
      .expect(200, { valido: false });
    const reuse = await request(server())
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'OtraClave2026' })
      .expect(400);
    expect(reuse.body.message).toContain('no es válido o ya venció');
  });

  it('si se piden varios enlaces cualquiera sirve, y al usar uno se anulan los demás', async () => {
    const first = await requestLink();
    const second = await requestLink();
    for (const token of [first, second]) {
      await request(server())
        .get('/api/auth/reset-password/validate')
        .query({ token })
        .expect(200, { valido: true });
    }

    await request(server())
      .post('/api/auth/reset-password')
      .send({ token: first, newPassword: 'ClaveTres2026' })
      .expect(200);
    await request(server())
      .post('/api/auth/reset-password')
      .send({ token: second, newPassword: 'ClaveCuatro2026' })
      .expect(400);
  });

  it('los enlaces vencidos no sirven', async () => {
    const token = await requestLink();
    await prisma.tokenRecuperacion.updateMany({
      where: { usuarioId: userId, usadoEn: null },
      data: { expiraEn: new Date(Date.now() - 1000) },
    });
    await request(server())
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'ClaveCinco2026' })
      .expect(400);
  });

  it('exige una contraseña nueva de 8 a 72 caracteres', async () => {
    const token = await requestLink();
    await request(server())
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'corta' })
      .expect(400);
  });
});
