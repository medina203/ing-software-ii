import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { deflateSync } from 'zlib';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/** PNG válido mínimo (1×1) generado en memoria. */
function tinyPng(): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buffer: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from([0, 245, 179, 1]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Etapa 6: imágenes de implementos, apariencia y validación de clientes. */
describe('Etapa 6 — imágenes, apariencia y validación de datos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let employeeToken: string;
  let categoryId: number;
  let uploadsDir: string;
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const nombre = `Taladro QA ${stamp}`;
  const docNumber = String(Date.now()).slice(-10);
  const previousUploads = process.env.UPLOADS_DIR;

  const server = () => app.getHttpServer();
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    uploadsDir = mkdtempSync(join(tmpdir(), 'dm-uploads-'));
    process.env.UPLOADS_DIR = uploadsDir;

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
        .send({ nombre: `Categoría etapa 6 ${stamp}`, prefijo: `S${stamp}` })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.implemento.deleteMany({ where: { categoriaId: categoryId } });
        await prisma.categoria.deleteMany({ where: { id: categoryId } });
        await prisma.cliente.deleteMany({
          where: { documentoIdentidad: { in: [`CC-${docNumber}`, 'NIT-901234567-8'] } },
        });
        await prisma.configuracion.deleteMany({});
      }
    } finally {
      await app?.close();
      rmSync(uploadsDir, { recursive: true, force: true });
      if (previousUploads === undefined) delete process.env.UPLOADS_DIR;
      else process.env.UPLOADS_DIR = previousUploads;
    }
  });

  describe('imágenes de implementos', () => {
    it('sube la imagen del tipo, la hereda la unidad nueva y se puede quitar', async () => {
      await request(server())
        .post('/api/items/batch')
        .set(auth(adminToken))
        .send({
          nombre,
          categoriaId: categoryId,
          precioAlquilerDiario: 40000,
          cantidad: 2,
        })
        .expect(201);

      await request(server())
        .post('/api/items/group/image')
        .set(auth(employeeToken))
        .field('categoriaId', categoryId)
        .field('nombre', nombre)
        .attach('imagen', tinyPng(), { filename: 'foto.png', contentType: 'image/png' })
        .expect(403);

      const uploaded = await request(server())
        .post('/api/items/group/image')
        .set(auth(adminToken))
        .field('categoriaId', categoryId)
        .field('nombre', nombre)
        .attach('imagen', tinyPng(), { filename: 'foto.png', contentType: 'image/png' })
        .expect(201);
      const url: string = uploaded.body.imagenUrl;
      expect(url).toMatch(/^\/uploads\/items\/[\w-]+\.png$/);
      expect(existsSync(join(uploadsDir, url.replace('/uploads/', '')))).toBe(true);

      const added = await request(server())
        .post('/api/items/batch')
        .set(auth(adminToken))
        .send({
          nombre,
          categoriaId: categoryId,
          precioAlquilerDiario: 40000,
          cantidad: 1,
        })
        .expect(201);
      expect(added.body.items[0].imagenUrl).toBe(url);

      const groups = await request(server())
        .get('/api/items/groups')
        .query({ categoriaId: categoryId })
        .set(auth(employeeToken))
        .expect(200);
      expect(groups.body.data[0]).toMatchObject({ nombre, imagenUrl: url, total: 3 });

      await request(server())
        .delete('/api/items/group/image')
        .query({ categoriaId: categoryId, nombre })
        .set(auth(adminToken))
        .expect(200);
      expect(existsSync(join(uploadsDir, url.replace('/uploads/', '')))).toBe(false);
    });

    it('rechaza archivos que no son imágenes aunque digan serlo', async () => {
      const response = await request(server())
        .post('/api/items/group/image')
        .set(auth(adminToken))
        .field('categoriaId', categoryId)
        .field('nombre', nombre)
        .attach('imagen', Buffer.from('<svg onload="alert(1)"></svg>'), {
          filename: 'falsa.png',
          contentType: 'image/png',
        })
        .expect(400);
      expect(response.body.message).toContain('Formato no permitido');
    });
  });

  describe('apariencia', () => {
    it('es pública para leer y solo el ADMIN la modifica', async () => {
      const current = await request(server()).get('/api/settings').expect(200);
      expect(current.body).toMatchObject({
        tema: expect.any(String),
        carrusel: expect.any(Array),
      });

      await request(server())
        .put('/api/settings')
        .set(auth(employeeToken))
        .send({ tema: 'oscuro' })
        .expect(403);

      const saved = await request(server())
        .put('/api/settings')
        .set(auth(adminToken))
        .send({
          tema: 'oscuro',
          tamanoFuente: 'grande',
          colorPrimario: 'verde',
          carrusel: [
            {
              titulo: 'Promoción de andamios',
              texto: 'Alquila 10 módulos y lleva el transporte incluido.',
              imagenUrl: '/ilustraciones/carrusel-inventario.svg',
              enlace: '/inventario',
            },
          ],
        })
        .expect(200);
      expect(saved.body).toMatchObject({
        tema: 'oscuro',
        tamanoFuente: 'grande',
        colorPrimario: 'verde',
        carrusel: [expect.objectContaining({ titulo: 'Promoción de andamios' })],
      });

      const publicView = await request(server()).get('/api/settings').expect(200);
      expect(publicView.body.colorPrimario).toBe('verde');
    });

    it('valida tema, color, cantidad de artículos y enlaces', async () => {
      const article = { titulo: 'Artículo', texto: 'Texto del artículo' };
      for (const body of [
        { tema: 'neón' },
        { colorPrimario: 'dorado' },
        { carrusel: Array.from({ length: 5 }, () => article) },
        { carrusel: [{ ...article, enlace: 'https://sitio-externo.com' }] },
        { carrusel: [{ ...article, imagenUrl: 'javascript:alert(1)' }] },
      ]) {
        await request(server())
          .put('/api/settings')
          .set(auth(adminToken))
          .send(body)
          .expect(400);
      }
    });

    it('sube y quita la imagen del login', async () => {
      const saved = await request(server())
        .post('/api/settings/login-image')
        .set(auth(adminToken))
        .attach('imagen', tinyPng(), { filename: 'fondo.png', contentType: 'image/png' })
        .expect(201);
      expect(saved.body.imagenLoginUrl).toMatch(/^\/uploads\/branding\/[\w-]+\.png$/);

      const cleared = await request(server())
        .delete('/api/settings/login-image')
        .set(auth(adminToken))
        .expect(200);
      expect(cleared.body.imagenLoginUrl).toBeNull();
    });
  });

  describe('validación de clientes', () => {
    const base = { nombres: 'Cliente', apellidos: 'Etapa 6' };

    it('rechaza documentos con letras o longitud inválida y teléfonos no numéricos', async () => {
      for (const body of [
        {
          ...base,
          documentoIdentidad: `CC-12AB${docNumber.slice(0, 4)}`,
          telefono: '3001234567',
        },
        { ...base, documentoIdentidad: 'CC-123', telefono: '3001234567' },
        { ...base, documentoIdentidad: '10324567', telefono: '3001234567' },
        { ...base, documentoIdentidad: 'NIT-90123456-7', telefono: '3001234567' },
        { ...base, documentoIdentidad: `CC-${docNumber}`, telefono: '300-ABC-4567' },
        { ...base, documentoIdentidad: `CC-${docNumber}`, telefono: '30012345678' },
      ]) {
        await request(server())
          .post('/api/clients')
          .set(auth(adminToken))
          .send(body)
          .expect(400);
      }
    });

    it('acepta CC y NIT con el formato correcto', async () => {
      await request(server())
        .post('/api/clients')
        .set(auth(adminToken))
        .send({
          ...base,
          documentoIdentidad: `cc-${docNumber}`,
          telefono: ' 3001234567 ',
        })
        .expect(201)
        .expect(({ body }) => {
          expect(body.documentoIdentidad).toBe(`CC-${docNumber}`);
          expect(body.telefono).toBe('3001234567');
        });
      await request(server())
        .post('/api/clients')
        .set(auth(adminToken))
        .send({ ...base, documentoIdentidad: 'NIT-901234567-8', telefono: '6015558899' })
        .expect(201);
    });
  });
});
