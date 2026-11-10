import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Etapa 2 — búsqueda, paginación y contraseña (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let temporaryUserId: number | undefined;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@obragest.local',
        password: 'Admin123*',
      })
      .expect(200);

    adminToken = loginResponse.body.accessToken as string;
  });

  afterAll(async () => {
    if (temporaryUserId) {
      await prisma.usuario.delete({ where: { id: temporaryUserId } });
    }
    await app.close();
  });

  it('busca clientes por cédula, nombre y apellido', async () => {
    const byDocument = await request(app.getHttpServer())
      .get('/api/clients')
      .query({ search: 'CC-10324567' })
      .set(auth(adminToken))
      .expect(200);

    expect(byDocument.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentoIdentidad: 'CC-10324567',
          nombres: 'Carlos Andrés',
          apellidos: 'Gómez Ruiz',
        }),
      ]),
    );

    const byName = await request(app.getHttpServer())
      .get('/api/clients')
      .query({ search: 'Carlos' })
      .set(auth(adminToken))
      .expect(200);

    expect(byName.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ documentoIdentidad: 'CC-10324567' }),
      ]),
    );

    const byLastName = await request(app.getHttpServer())
      .get('/api/clients')
      .query({ search: 'Gómez' })
      .set(auth(adminToken))
      .expect(200);

    expect(byLastName.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ documentoIdentidad: 'CC-10324567' }),
      ]),
    );
  });

  it('limita las coincidencias sin perder el total de clientes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/clients')
      .query({ search: 'CC', limit: 1 })
      .set(auth(adminToken))
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.total).toBeGreaterThanOrEqual(1);
  });

  it('pagina el inventario y devuelve metadatos consistentes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/items')
      .query({ page: 1, pageSize: 5 })
      .set(auth(adminToken))
      .expect(200);

    expect(response.body.data.length).toBeLessThanOrEqual(5);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(5);
    expect(response.body.total).toBeGreaterThanOrEqual(1);
    expect(response.body.totalPages).toBe(
      Math.max(1, Math.ceil(response.body.total / 5)),
    );

    const secondPage = await request(app.getHttpServer())
      .get('/api/items')
      .query({ page: 2, pageSize: 5 })
      .set(auth(adminToken))
      .expect(200);

    expect(secondPage.body.page).toBe(2);
    expect(secondPage.body.data.length).toBeLessThanOrEqual(5);
  });

  it('pagina más de 200 implementos sin truncar el inventario', async () => {
    const category = await prisma.categoria.findFirst({
      orderBy: { id: 'asc' },
    });

    expect(category).not.toBeNull();

    const prefix = `QA-VOL-${Date.now()}-`;
    const rows = Array.from({ length: 205 }, (_, index) => ({
      codigoSerie: `${prefix}${String(index + 1).padStart(3, '0')}`,
      nombre: `Implemento de volumen ${index + 1}`,
      categoriaId: category!.id,
      descripcion: 'Registro temporal de prueba de paginación.',
      precioAlquilerDiario: 1000,
      estado: 'DISPONIBLE' as const,
    }));

    await prisma.implemento.createMany({ data: rows });

    try {
      const response = await request(app.getHttpServer())
        .get('/api/items')
        .query({ page: 2, pageSize: 100 })
        .set(auth(adminToken))
        .expect(200);

      expect(response.body.total).toBeGreaterThanOrEqual(205);
      expect(response.body.data).toHaveLength(100);
      expect(response.body.page).toBe(2);
      expect(response.body.totalPages).toBe(
        Math.max(1, Math.ceil(response.body.total / 100)),
      );
    } finally {
      await prisma.implemento.deleteMany({
        where: { codigoSerie: { startsWith: prefix } },
      });
    }
  });

  it('permite cambiar la contraseña de un ADMIN y volver a iniciar sesión', async () => {
    const email = `qa-stage2-${Date.now()}@obragest.local`;
    const initialPassword = 'Stage2Inicial123*';
    const newPassword = 'Stage2Nueva123*';

    const created = await request(app.getHttpServer())
      .post('/api/users')
      .set(auth(adminToken))
      .send({
        nombre: 'QA Etapa 2 ADMIN',
        email,
        password: initialPassword,
        rol: 'ADMIN',
      })
      .expect(201);

    temporaryUserId = created.body.id as number;

    const userLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: initialPassword })
      .expect(200);

    const userToken = userLogin.body.accessToken as string;

    await request(app.getHttpServer())
      .patch('/api/auth/password')
      .set(auth(userToken))
      .send({
        currentPassword: 'ClaveEquivocada123*',
        newPassword,
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/api/auth/password')
      .set(auth(userToken))
      .send({
        currentPassword: initialPassword,
        newPassword,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: newPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: initialPassword })
      .expect(401);
  });
});
