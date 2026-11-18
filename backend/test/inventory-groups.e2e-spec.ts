import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { deleteRentalsCascade } from './helpers/cleanup';

/** Inventario agrupado: una entrada por tipo de implemento con su stock (RF-09, RF-20). */
describe('Inventario agrupado por tipo (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let employeeToken: string;
  let categoryId: number;
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const prefix = `G${stamp}`;
  const nombre = `Andamio QA ${stamp}`;
  const clientDoc = `QA-GRP-${stamp}`;

  const server = () => app.getHttpServer();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const groups = (query: Record<string, string | number> = {}) =>
    request(server())
      .get('/api/items/groups')
      .query({ categoriaId: categoryId, ...query })
      .set(auth(adminToken))
      .expect(200);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

    adminToken = (
      await request(server())
        .post('/api/auth/login')
        .send({ email: 'admin@obragest.local', password: 'Admin123*' })
        .expect(200)
    ).body.accessToken;
    employeeToken = (
      await request(server())
        .post('/api/auth/login')
        .send({ email: 'empleado@obragest.local', password: 'Empleado123*' })
        .expect(200)
    ).body.accessToken;

    categoryId = (
      await request(server())
        .post('/api/categories')
        .set(auth(adminToken))
        .send({ nombre: `Categoría grupos ${stamp}`, prefijo: prefix })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    try {
      if (prisma && categoryId) {
        const rentals = await prisma.alquiler.findMany({
          where: { cliente: { documentoIdentidad: clientDoc } },
          select: { id: true },
        });
        await deleteRentalsCascade(
          prisma,
          rentals.map((rental) => rental.id),
        );
        await prisma.cliente.deleteMany({ where: { documentoIdentidad: clientDoc } });
        await prisma.implemento.deleteMany({ where: { categoriaId: categoryId } });
        await prisma.categoria.deleteMany({ where: { id: categoryId } });
      }
    } finally {
      await app?.close();
    }
  });

  it('las unidades del mismo tipo forman una sola entrada con su stock', async () => {
    await request(server())
      .post('/api/items/batch')
      .set(auth(adminToken))
      .send({
        nombre,
        categoriaId: categoryId,
        precioAlquilerDiario: 28000,
        descripcion: 'Módulo certificado',
        cantidad: 3,
      })
      .expect(201);
    // Mismo tipo escrito con otra capitalización y espacios: suma al stock.
    const extra = await request(server())
      .post('/api/items/batch')
      .set(auth(adminToken))
      .send({
        nombre: `  ${nombre.toUpperCase()} `,
        categoriaId: categoryId,
        precioAlquilerDiario: 28000,
        cantidad: 2,
      })
      .expect(201);
    expect(extra.body.items[0].nombre).toBe(nombre);
    await request(server())
      .post('/api/items/batch')
      .set(auth(adminToken))
      .send({
        nombre: `Escalera QA ${stamp}`,
        categoriaId: categoryId,
        precioAlquilerDiario: 9000,
        cantidad: 1,
      })
      .expect(201);

    const response = await groups();

    expect(response.body.total).toBe(2);
    expect(response.body.totalUnidades).toBe(6);
    const andamio = response.body.data.find(
      (g: { nombre: string }) => g.nombre === nombre,
    );
    expect(andamio).toMatchObject({
      total: 5,
      disponibles: 5,
      alquilados: 0,
      precioMin: '28000',
      precioMax: '28000',
      descripcion: 'Módulo certificado',
      categoria: { prefijo: prefix },
    });
  });

  it('el stock refleja alquileres y cambios de estado', async () => {
    const units = await request(server())
      .get('/api/items')
      .query({ categoriaId: categoryId, nombre: nombre.toLowerCase(), pageSize: 50 })
      .set(auth(adminToken))
      .expect(200);
    expect(units.body.total).toBe(5);
    expect(units.body.data.map((u: { codigoSerie: string }) => u.codigoSerie)).toEqual([
      `${prefix}-001`,
      `${prefix}-002`,
      `${prefix}-003`,
      `${prefix}-004`,
      `${prefix}-005`,
    ]);

    const client = await prisma.cliente.create({
      data: {
        documentoIdentidad: clientDoc,
        nombres: 'QA',
        apellidos: 'Grupos',
        telefono: '300',
      },
    });
    const due = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
      new Date(Date.now() + 3 * 86_400_000),
    );
    await request(server())
      .post('/api/rentals')
      .set(auth(adminToken))
      .send({
        clienteId: client.id,
        fechaPactadaDevolucion: due,
        implementos: [
          { implementoId: units.body.data[0].id },
          { implementoId: units.body.data[1].id },
        ],
      })
      .expect(201);
    await request(server())
      .patch(`/api/items/${units.body.data[2].id}`)
      .set(auth(adminToken))
      .send({ estado: 'MANTENIMIENTO' })
      .expect(200);

    const andamio = (await groups({ search: nombre })).body.data[0];
    expect(andamio).toMatchObject({
      total: 5,
      disponibles: 2,
      alquilados: 2,
      mantenimiento: 1,
    });

    // El filtro por estado selecciona tipos, pero los conteos siguen completos.
    const rented = await groups({ estado: 'ALQUILADO' });
    expect(rented.body.total).toBe(1);
    expect(rented.body.data[0]).toMatchObject({ nombre, total: 5 });

    // Buscar un serial devuelve su tipo.
    const bySerial = await groups({ search: `${prefix}-004` });
    expect(bySerial.body.data.map((g: { nombre: string }) => g.nombre)).toEqual([nombre]);
  });

  it('editar el tipo actualiza todas sus unidades y evita duplicar nombres', async () => {
    await request(server())
      .patch('/api/items/group')
      .set(auth(employeeToken))
      .send({ categoriaId: categoryId, nombre, precioAlquilerDiario: 30000 })
      .expect(403);

    await request(server())
      .patch('/api/items/group')
      .set(auth(adminToken))
      .send({ categoriaId: categoryId, nombre, nuevoNombre: `Escalera QA ${stamp}` })
      .expect(409);

    const updated = await request(server())
      .patch('/api/items/group')
      .set(auth(adminToken))
      .send({ categoriaId: categoryId, nombre, precioAlquilerDiario: 30000 })
      .expect(200);
    expect(updated.body).toMatchObject({
      precioMin: '30000',
      precioMax: '30000',
      total: 5,
    });
  });

  it('eliminar un tipo es todo o nada', async () => {
    const blocked = await request(server())
      .delete('/api/items/group')
      .query({ categoriaId: categoryId, nombre })
      .set(auth(adminToken))
      .expect(409);
    expect(blocked.body.message).toContain('historial');
    expect((await groups({ search: nombre })).body.data[0].total).toBe(5);

    const removed = await request(server())
      .delete('/api/items/group')
      .query({ categoriaId: categoryId, nombre: `Escalera QA ${stamp}` })
      .set(auth(adminToken))
      .expect(200);
    expect(removed.body.total).toBe(1);
    expect((await groups()).body.total).toBe(1);
  });
});
