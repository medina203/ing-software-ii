import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EstadoImplemento } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { deleteRentalsCascade } from './helpers/cleanup';

describe('Etapa 3 — seriales automáticos y cantidad (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let clientId: number;

  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const clientDocument = `QA-ST3-${stamp}`;
  const categoryIds: number[] = [];
  const itemIds: number[] = [];

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  function futureDate(days = 5): string {
    const date = new Date();
    date.setUTCHours(12, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  async function createCategory(suffix: string, prefijo: string) {
    const response = await request(app.getHttpServer())
      .post('/api/categories')
      .set(auth(adminToken))
      .send({
        nombre: `Categoría QA ${stamp} ${suffix}`,
        prefijo,
        descripcion: 'Categoría temporal de la Etapa 3.',
      })
      .expect(201);

    const category = response.body as {
      id: number;
      prefijo: string;
      ultimoConsecutivo: number;
    };
    categoryIds.push(category.id);
    return category;
  }

  async function createItem(categoriaId: number, nombre: string) {
    const response = await request(app.getHttpServer())
      .post('/api/items')
      .set(auth(adminToken))
      .send({
        nombre,
        categoriaId,
        descripcion: 'Implemento temporal de la Etapa 3.',
        precioAlquilerDiario: 1000,
      })
      .expect(201);

    const item = response.body as {
      id: number;
      codigoSerie: string;
      categoria: { prefijo: string };
    };
    itemIds.push(item.id);
    return item;
  }

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

    const client = await prisma.cliente.create({
      data: {
        documentoIdentidad: clientDocument,
        nombres: 'Cliente',
        apellidos: `Etapa 3 ${stamp}`,
        telefono: '3000000000',
        correo: `qa-stage3-${stamp}@obragest.local`,
      },
      select: { id: true },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    try {
      if (prisma && categoryIds.length > 0) {
        const testItems = await prisma.implemento.findMany({
          where: { categoriaId: { in: categoryIds } },
          select: { id: true },
        });
        const testItemIds = testItems.map((item) => item.id);

        if (testItemIds.length > 0) {
          const details = await prisma.detalleAlquiler.findMany({
            where: { implementoId: { in: testItemIds } },
            select: { alquilerId: true },
          });
          const rentalIds = [...new Set(details.map((detail) => detail.alquilerId))];

          await deleteRentalsCascade(prisma, rentalIds);

          await prisma.implemento.deleteMany({
            where: { id: { in: testItemIds } },
          });
        }

        await prisma.categoria.deleteMany({
          where: { id: { in: categoryIds } },
        });
      }

      if (prisma) {
        await prisma.cliente.deleteMany({
          where: { documentoIdentidad: clientDocument },
        });
      }
    } finally {
      await app?.close();
    }
  });

  it('crea categorías con prefijo único y rechaza duplicados o formatos inválidos', async () => {
    const prefix = `QA${stamp}A`;
    const category = await createCategory('A', prefix);

    expect(category.prefijo).toBe(prefix);
    expect(category.ultimoConsecutivo).toBe(0);

    await request(app.getHttpServer())
      .post('/api/categories')
      .set(auth(adminToken))
      .send({
        nombre: `Categoría duplicada ${stamp}`,
        prefijo: prefix,
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/categories')
      .set(auth(adminToken))
      .send({
        nombre: `Categoría inválida ${stamp}`,
        prefijo: '1INVALIDO',
      })
      .expect(400);
  });

  it('genera seriales consecutivos y no acepta un serial manual', async () => {
    const prefix = `QA${stamp}B`;
    const category = await createCategory('B', prefix);

    const first = await createItem(category.id, `Taladro QA ${stamp} 1`);
    const second = await createItem(category.id, `Taladro QA ${stamp} 2`);

    expect(first.codigoSerie).toBe(`${prefix}-001`);
    expect(second.codigoSerie).toBe(`${prefix}-002`);

    await request(app.getHttpServer())
      .post('/api/items')
      .set(auth(adminToken))
      .send({
        codigoSerie: 'MANUAL-001',
        nombre: `Taladro manual QA ${stamp}`,
        categoriaId: category.id,
        precioAlquilerDiario: 1000,
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/categories/${category.id}`)
      .set(auth(adminToken))
      .send({ prefijo: `QA${stamp}Z` })
      .expect(409);

    const persisted = await prisma.categoria.findUniqueOrThrow({
      where: { id: category.id },
      select: { prefijo: true, ultimoConsecutivo: true },
    });
    expect(persisted.prefijo).toBe(prefix);
    expect(persisted.ultimoConsecutivo).toBe(2);
  });

  it('crea varias unidades en una sola operación con seriales consecutivos', async () => {
    const prefix = `QA${stamp}F`;
    const category = await createCategory('F', prefix);

    const response = await request(app.getHttpServer())
      .post('/api/items/batch')
      .set(auth(adminToken))
      .send({
        nombre: `Andamio lote QA ${stamp}`,
        categoriaId: category.id,
        descripcion: 'Lote temporal de la Etapa 3.',
        precioAlquilerDiario: 1000,
        cantidad: 3,
      })
      .expect(201);

    const body = response.body as {
      items: Array<{ id: number; codigoSerie: string }>;
      total: number;
    };

    expect(body.total).toBe(3);
    expect(body.items.map((item) => item.codigoSerie)).toEqual([
      `${prefix}-001`,
      `${prefix}-002`,
      `${prefix}-003`,
    ]);

    const persisted = await prisma.categoria.findUniqueOrThrow({
      where: { id: category.id },
      select: { ultimoConsecutivo: true },
    });
    expect(persisted.ultimoConsecutivo).toBe(3);

    const created = await prisma.implemento.findMany({
      where: { categoriaId: category.id },
      select: { id: true },
    });
    itemIds.push(...created.map((item) => item.id));

    for (const cantidad of [0, 101]) {
      await request(app.getHttpServer())
        .post('/api/items/batch')
        .set(auth(adminToken))
        .send({
          nombre: `Lote inválido QA ${stamp}`,
          categoriaId: category.id,
          precioAlquilerDiario: 1000,
          cantidad,
        })
        .expect(400);
    }
  });

  it('genera seriales únicos bajo creación concurrente', async () => {
    const prefix = `QA${stamp}C`;
    const category = await createCategory('C', prefix);
    const concurrentCount = 6;

    const responses = await Promise.all(
      Array.from({ length: concurrentCount }, (_, index) =>
        request(app.getHttpServer())
          .post('/api/items')
          .set(auth(adminToken))
          .send({
            nombre: `Concurrente QA ${stamp} ${index + 1}`,
            categoriaId: category.id,
            precioAlquilerDiario: 1000,
          }),
      ),
    );

    expect(responses.every((response) => response.status === 201)).toBe(true);

    const serials = responses
      .map((response) => (response.body as { codigoSerie: string }).codigoSerie)
      .sort();

    expect(serials).toEqual(
      Array.from(
        { length: concurrentCount },
        (_, index) => `${prefix}-${String(index + 1).padStart(3, '0')}`,
      ),
    );

    const created = await prisma.implemento.findMany({
      where: { categoriaId: category.id },
      select: { id: true },
    });
    itemIds.push(...created.map((item) => item.id));
  });

  it('registra un alquiler con 5 unidades del mismo tipo y las descuenta', async () => {
    const prefix = `QA${stamp}D`;
    const category = await createCategory('D', prefix);
    const items = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        createItem(category.id, `Andamio QA ${stamp}`),
      ),
    );

    const serials = items.map((item) => item.codigoSerie).sort();
    expect(serials).toEqual(
      Array.from(
        { length: 5 },
        (_, index) => `${prefix}-${String(index + 1).padStart(3, '0')}`,
      ),
    );

    const rentalResponse = await request(app.getHttpServer())
      .post('/api/rentals')
      .set(auth(adminToken))
      .send({
        clienteId: clientId,
        fechaPactadaDevolucion: futureDate(),
        observaciones: 'Alquiler de 5 unidades de la Etapa 3.',
        implementos: items.map((item) => ({ implementoId: item.id })),
      })
      .expect(201);

    const rental = rentalResponse.body as {
      id: number;
      detalles: Array<{
        implemento: { codigoSerie: string; estado: string };
      }>;
    };

    expect(rental.detalles).toHaveLength(5);
    expect(rental.detalles.map((detail) => detail.implemento.codigoSerie).sort()).toEqual(
      serials,
    );
    expect(
      rental.detalles.every(
        (detail) => detail.implemento.estado === EstadoImplemento.ALQUILADO,
      ),
    ).toBe(true);

    const available = await request(app.getHttpServer())
      .get('/api/items')
      .query({ categoriaId: category.id, estado: 'DISPONIBLE' })
      .set(auth(adminToken))
      .expect(200);
    expect(available.body.total).toBe(0);

    const rented = await request(app.getHttpServer())
      .get('/api/items')
      .query({ categoriaId: category.id, estado: 'ALQUILADO' })
      .set(auth(adminToken))
      .expect(200);
    expect(rented.body.total).toBe(5);

    await request(app.getHttpServer())
      .post('/api/rentals')
      .set(auth(adminToken))
      .send({
        clienteId: clientId,
        fechaPactadaDevolucion: futureDate(),
        implementos: [{ implementoId: items[0].id }],
        // El cliente ya tiene la factura del alquiler anterior (RF-16).
        autorizacionCartera: { motivo: 'Prueba e2e de disponibilidad (Etapa 3)' },
      })
      .expect(409);
  });

  it('rechaza la cantidad cuando no hay unidades suficientes y no deja estados parciales', async () => {
    const prefix = `QA${stamp}E`;
    const category = await createCategory('E', prefix);
    const items = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        createItem(category.id, `Escalera QA ${stamp} ${index + 1}`),
      ),
    );

    await prisma.implemento.updateMany({
      where: {
        id: { in: [items[3].id, items[4].id] },
      },
      data: { estado: EstadoImplemento.MANTENIMIENTO },
    });

    const response = await request(app.getHttpServer())
      .post('/api/rentals')
      .set(auth(adminToken))
      .send({
        clienteId: clientId,
        fechaPactadaDevolucion: futureDate(),
        implementos: items.map((item) => ({ implementoId: item.id })),
        autorizacionCartera: { motivo: 'Prueba e2e de disponibilidad (Etapa 3)' },
      })
      .expect(409);

    expect(response.body.message).toContain(items[3].codigoSerie);
    expect(response.body.message).toContain(items[4].codigoSerie);

    const availableItems = await prisma.implemento.findMany({
      where: {
        id: { in: items.slice(0, 3).map((item) => item.id) },
      },
      select: { estado: true },
    });
    expect(
      availableItems.every((item) => item.estado === EstadoImplemento.DISPONIBLE),
    ).toBe(true);

    const details = await prisma.detalleAlquiler.count({
      where: { implementoId: { in: items.map((item) => item.id) } },
    });
    expect(details).toBe(0);
  });
});
