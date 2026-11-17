import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EstadoAlquiler, EstadoFactura, EstadoImplemento, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { deleteRentalsCascade } from './helpers/cleanup';

/**
 * Etapa 4 (facturación y cartera) y Etapa 5 (seguridad y confiabilidad).
 * Trazabilidad: RF-15, RF-16, RF-17, RF-21, RNF-01, RNF-08 y regla H-06.
 */
describe('Etapas 4 y 5 — cartera, liquidación y seguridad (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let employeeToken: string;
  let employeeId: number;

  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const prefix = `Q4${stamp}`;
  const clientIds: number[] = [];
  const itemIds: number[] = [];
  const userEmails: string[] = [];
  let categoryId: number;

  const server = () => app.getHttpServer();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  function dateOnly(daysFromToday: number): string {
    // Fecha de calendario en Bogotá, como la envía la interfaz.
    const now = new Date(Date.now() + daysFromToday * 86_400_000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(now);
  }

  async function createClient(suffix: string) {
    const client = await prisma.cliente.create({
      data: {
        documentoIdentidad: `QA-ST4-${stamp}-${suffix}`,
        nombres: 'Cliente',
        apellidos: `Etapa 4 ${stamp} ${suffix}`,
        telefono: '3000000000',
      },
      select: { id: true },
    });
    clientIds.push(client.id);
    return client.id;
  }

  async function createItems(count: number, price = 10000) {
    const response = await request(server())
      .post('/api/items/batch')
      .set(auth(adminToken))
      .send({
        nombre: `Mezcladora QA ${stamp}`,
        categoriaId: categoryId,
        precioAlquilerDiario: price,
        cantidad: count,
      })
      .expect(201);
    const created = response.body.items as Array<{ id: number }>;
    itemIds.push(...created.map((item) => item.id));
    return created;
  }

  async function createTempUser(rol: Rol, password: string) {
    const email = `qa-st4-${stamp.toLowerCase()}-${userEmails.length}@obragest.local`;
    await prisma.usuario.create({
      data: {
        nombre: `QA Etapa 4 ${rol}`,
        email,
        rol,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
    userEmails.push(email);
    return email;
  }

  function rent(token: string, clienteId: number, ids: number[], extra = {}) {
    return request(server())
      .post('/api/rentals')
      .set(auth(token))
      .send({
        clienteId,
        fechaPactadaDevolucion: dateOnly(3),
        implementos: ids.map((implementoId) => ({ implementoId })),
        ...extra,
      });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

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

    const admin = await request(server())
      .post('/api/auth/login')
      .send({ email: 'admin@obragest.local', password: 'Admin123*' })
      .expect(200);
    adminToken = admin.body.accessToken as string;

    const employee = await request(server())
      .post('/api/auth/login')
      .send({ email: 'empleado@obragest.local', password: 'Empleado123*' })
      .expect(200);
    employeeToken = employee.body.accessToken as string;
    employeeId = employee.body.usuario.id as number;

    const category = await request(server())
      .post('/api/categories')
      .set(auth(adminToken))
      .send({ nombre: `Categoría QA Etapa 4 ${stamp}`, prefijo: prefix })
      .expect(201);
    categoryId = category.body.id as number;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        const details = await prisma.detalleAlquiler.findMany({
          where: { implementoId: { in: itemIds } },
          select: { alquilerId: true },
        });
        await deleteRentalsCascade(prisma, [
          ...new Set(details.map((d) => d.alquilerId)),
        ]);
        await prisma.implemento.deleteMany({ where: { id: { in: itemIds } } });
        if (categoryId) await prisma.categoria.deleteMany({ where: { id: categoryId } });
        await prisma.cliente.deleteMany({ where: { id: { in: clientIds } } });
        await prisma.usuario.deleteMany({ where: { email: { in: userEmails } } });
      }
    } finally {
      await app?.close();
    }
  });

  it('RF-17: el alquiler genera una factura PENDIENTE por los días pactados', async () => {
    const clienteId = await createClient('A');
    const [item] = await createItems(1, 12000);

    const response = await rent(adminToken, clienteId, [item.id]).expect(201);

    expect(response.body.factura).toMatchObject({
      estado: EstadoFactura.PENDIENTE,
      total: '36000',
      saldo: '36000',
    });
    expect(response.body.factura.codigoFactura).toMatch(/^FAC-\d{8}-\d{5}$/);
  });

  it('RF-16/RF-21: un EMPLEADO necesita autorización de ADMIN y queda auditada', async () => {
    const clienteId = await createClient('B');
    const items = await createItems(3);
    await rent(adminToken, clienteId, [items[0].id]).expect(201);

    // Sin autorización → 403.
    const denied = await rent(employeeToken, clienteId, [items[1].id]).expect(403);
    expect(denied.body.message).toContain('saldo pendiente');

    // Credenciales de ADMIN incorrectas → 401 y sin estados parciales.
    await rent(employeeToken, clienteId, [items[1].id], {
      autorizacionCartera: {
        motivo: 'Cliente frecuente, paga el viernes',
        adminEmail: 'admin@obragest.local',
        adminPassword: 'incorrecta',
      },
    }).expect(401);
    const still = await prisma.implemento.findUniqueOrThrow({
      where: { id: items[1].id },
    });
    expect(still.estado).toBe(EstadoImplemento.DISPONIBLE);

    // Credenciales válidas → 201 con auditoría completa.
    const ok = await rent(employeeToken, clienteId, [items[1].id], {
      autorizacionCartera: {
        motivo: 'Cliente frecuente, paga el viernes',
        adminEmail: 'admin@obragest.local',
        adminPassword: 'Admin123*',
      },
    }).expect(201);

    const audit = await prisma.autorizacionCartera.findUniqueOrThrow({
      where: { alquilerId: ok.body.id },
      include: { administrador: true },
    });
    expect(audit).toMatchObject({
      clienteId,
      usuarioSolicitanteId: employeeId,
      motivo: 'Cliente frecuente, paga el viernes',
    });
    expect(audit.administrador.rol).toBe(Rol.ADMIN);
    expect(audit.saldoPendiente.toString()).toBe('30000');
    expect(audit.createdAt).toBeInstanceOf(Date);
  });

  it('RF-15: la devolución con cartera pendiente se permite y registra la alerta', async () => {
    const clienteId = await createClient('C');
    const [item] = await createItems(1);
    const rental = await rent(adminToken, clienteId, [item.id]).expect(201);

    const response = await request(server())
      .post('/api/returns')
      .set(auth(employeeToken))
      .send({
        alquilerId: rental.body.id,
        implementos: [{ implementoId: item.id, estadoFinal: 'DISPONIBLE' }],
      })
      .expect(201);

    expect(response.body.alertaCartera).toBe(true);
    expect(response.body.saldoCarteraAlerta).toBe('30000');
  });

  it('liquida la factura con los días reales en una devolución tardía', async () => {
    const clienteId = await createClient('D');
    const [item] = await createItems(1, 10000);
    const rental = await rent(adminToken, clienteId, [item.id]).expect(201);

    // Simula un alquiler de hace 6 días pactado para hace 2 días.
    const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000);
    const twoDaysAgo = new Date(`${dateOnly(-2)}T12:00:00.000Z`);
    await prisma.alquiler.update({
      where: { id: rental.body.id },
      data: { fechaAlquiler: sixDaysAgo, fechaPactadaDevolucion: twoDaysAgo },
    });
    await prisma.factura.update({
      where: { alquilerId: rental.body.id },
      data: {
        fechaEmision: sixDaysAgo,
        fechaVencimiento: twoDaysAgo,
        total: 40000,
        saldo: 10000,
      },
    });

    await request(server())
      .post('/api/returns')
      .set(auth(adminToken))
      .send({
        alquilerId: rental.body.id,
        implementos: [{ implementoId: item.id, estadoFinal: 'DISPONIBLE' }],
      })
      .expect(201);

    const factura = await prisma.factura.findUniqueOrThrow({
      where: { alquilerId: rental.body.id },
    });
    // 6 días × 10.000 = 60.000; ya pagó 30.000 → saldo 30.000, vencida.
    expect(factura.total.toString()).toBe('60000');
    expect(factura.saldo.toString()).toBe('30000');
    expect(factura.estado).toBe(EstadoFactura.VENCIDA);
  });

  it('RF-17: los pagos actualizan el saldo y la factura pasa a PAGADA', async () => {
    const clienteId = await createClient('E');
    const [item] = await createItems(1, 5000);
    const rental = await rent(adminToken, clienteId, [item.id]).expect(201);
    const facturaId = rental.body.factura.id as number;

    await request(server())
      .post(`/api/invoices/${facturaId}/payments`)
      .set(auth(employeeToken))
      .send({ monto: 20000, metodoPago: 'EFECTIVO' })
      .expect(400);

    const partial = await request(server())
      .post(`/api/invoices/${facturaId}/payments`)
      .set(auth(employeeToken))
      .send({ monto: 5000.5, metodoPago: 'TRANSFERENCIA', referencia: 'TRX-1' })
      .expect(201);
    expect(partial.body.saldo).toBe('9999.5');
    expect(partial.body.estado).toBe(EstadoFactura.PENDIENTE);

    const full = await request(server())
      .post(`/api/invoices/${facturaId}/payments`)
      .set(auth(employeeToken))
      .send({ monto: 9999.5, metodoPago: 'EFECTIVO' })
      .expect(201);
    expect(full.body.saldo).toBe('0');
    expect(full.body.estado).toBe(EstadoFactura.PAGADA);

    const pending = await request(server())
      .get(`/api/invoices/client/${clienteId}/pending`)
      .set(auth(employeeToken))
      .expect(200);
    expect(pending.body.cantidad).toBe(0);

    await request(server())
      .post(`/api/invoices/${facturaId}/payments`)
      .set(auth(employeeToken))
      .send({ monto: 1, metodoPago: 'EFECTIVO' })
      .expect(409);
  });

  it('H-06: las consultas GET no modifican la base de datos y muestran el estado efectivo', async () => {
    const clienteId = await createClient('F');
    const [item] = await createItems(1);
    const rental = await rent(adminToken, clienteId, [item.id]).expect(201);
    const past = new Date(`${dateOnly(-3)}T12:00:00.000Z`);

    await prisma.alquiler.update({
      where: { id: rental.body.id },
      data: { estado: EstadoAlquiler.ACTIVO, fechaPactadaDevolucion: past },
    });
    await prisma.factura.update({
      where: { alquilerId: rental.body.id },
      data: { estado: EstadoFactura.PENDIENTE, fechaVencimiento: past },
    });
    const before = await prisma.alquiler.findUniqueOrThrow({
      where: { id: rental.body.id },
    });

    const detail = await request(server())
      .get(`/api/rentals/${rental.body.id}`)
      .set(auth(adminToken))
      .expect(200);
    expect(detail.body.estado).toBe(EstadoAlquiler.VENCIDO);
    expect(detail.body.factura.estado).toBe(EstadoFactura.VENCIDA);

    const overdue = await request(server())
      .get('/api/rentals')
      .query({ estado: 'VENCIDO', search: `QA-ST4-${stamp}-F` })
      .set(auth(adminToken))
      .expect(200);
    expect(overdue.body.data.map((r: { id: number }) => r.id)).toContain(rental.body.id);

    await request(server()).get('/api/invoices').set(auth(adminToken)).expect(200);
    await request(server()).get('/api/clients').set(auth(adminToken)).expect(200);
    await request(server()).get('/api/returns/pending').set(auth(adminToken)).expect(200);
    await request(server())
      .get('/api/reports/dashboard')
      .set(auth(adminToken))
      .expect(200);
    await request(server())
      .get('/api/reports/active-rentals')
      .set(auth(adminToken))
      .expect(200);

    const after = await prisma.alquiler.findUniqueOrThrow({
      where: { id: rental.body.id },
    });
    const factura = await prisma.factura.findUniqueOrThrow({
      where: { alquilerId: rental.body.id },
    });
    expect(after.estado).toBe(EstadoAlquiler.ACTIVO);
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    expect(factura.estado).toBe(EstadoFactura.PENDIENTE);
  });

  it('RNF-08: /api/health verifica la base de datos', async () => {
    const response = await request(server()).get('/api/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('RNF-01: tras 5 intentos fallidos el login responde 429', async () => {
    const email = await createTempUser(Rol.EMPLEADO, 'Clave123*');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(server())
        .post('/api/auth/login')
        .send({ email, password: 'incorrecta' })
        .expect(401);
    }

    const blocked = await request(server())
      .post('/api/auth/login')
      .send({ email, password: 'Clave123*' })
      .expect(429);
    expect(blocked.body.message).toContain('Demasiados intentos');
  });

  it('RNF-01: la validación de credenciales de ADMIN en cartera también se bloquea', async () => {
    const adminEmail = await createTempUser(Rol.ADMIN, 'Admin456*');
    const clienteId = await createClient('G');
    const items = await createItems(2);
    await rent(adminToken, clienteId, [items[0].id]).expect(201);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await rent(employeeToken, clienteId, [items[1].id], {
        autorizacionCartera: { motivo: 'Fuerza bruta', adminEmail, adminPassword: 'x' },
      }).expect(401);
    }

    await rent(employeeToken, clienteId, [items[1].id], {
      autorizacionCartera: {
        motivo: 'Fuerza bruta',
        adminEmail,
        adminPassword: 'Admin456*',
      },
    }).expect(429);
  });
});
