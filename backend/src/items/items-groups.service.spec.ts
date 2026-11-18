import { ConflictException } from '@nestjs/common';
import { EstadoImplemento, Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from './items.service';

/** Inventario agrupado por tipo: una tarjeta por implemento con su stock. */
describe('ItemsService — inventario agrupado por tipo', () => {
  const implemento = {
    groupBy: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
  };
  const categoria = { findUnique: jest.fn(), update: jest.fn() };
  const tx = { implemento, categoria };
  const prisma = {
    implemento,
    categoria,
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
  const service = new ItemsService(prisma);

  const andamio = { categoriaId: 3, nombre: 'Andamio certificado 2 m' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve un solo registro por tipo con el stock por estado', async () => {
    implemento.groupBy
      // 1) tipos que cumplen el filtro
      .mockResolvedValueOnce([andamio])
      // 2) conteos por estado
      .mockResolvedValueOnce([
        { ...andamio, estado: EstadoImplemento.DISPONIBLE, _count: { _all: 7 } },
        { ...andamio, estado: EstadoImplemento.ALQUILADO, _count: { _all: 2 } },
        { ...andamio, estado: EstadoImplemento.MANTENIMIENTO, _count: { _all: 1 } },
      ])
      // 3) rango de tarifas
      .mockResolvedValueOnce([
        {
          ...andamio,
          _min: { precioAlquilerDiario: new Prisma.Decimal(28000) },
          _max: { precioAlquilerDiario: new Prisma.Decimal(28000) },
        },
      ]);
    implemento.findMany
      .mockResolvedValueOnce([
        {
          ...andamio,
          descripcion: null,
          categoria: { id: 3, nombre: 'Andamios y acceso', prefijo: 'AND' },
        },
      ])
      // La última unidad no tiene descripción: se usa la más reciente no vacía.
      .mockResolvedValueOnce([{ ...andamio, descripcion: 'Módulo con plataforma' }]);
    implemento.count.mockResolvedValue(10);

    const result = await service.findGroups({ page: 1, pageSize: 9 });

    expect(result.total).toBe(1);
    expect(result.totalUnidades).toBe(10);
    expect(result.data).toEqual([
      {
        ...andamio,
        categoria: { id: 3, nombre: 'Andamios y acceso', prefijo: 'AND' },
        descripcion: 'Módulo con plataforma',
        precioMin: '28000',
        precioMax: '28000',
        total: 10,
        disponibles: 7,
        alquilados: 2,
        mantenimiento: 1,
        fueraDeServicio: 0,
      },
    ]);
  });

  it('pagina por tipos, no por unidades', async () => {
    const tipos = Array.from({ length: 12 }, (_, i) => ({
      categoriaId: 1,
      nombre: `Tipo ${String(i).padStart(2, '0')}`,
    }));
    implemento.groupBy
      .mockResolvedValueOnce(tipos)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    implemento.findMany.mockResolvedValue([]);
    implemento.count.mockResolvedValue(500);

    const result = await service.findGroups({ page: 2, pageSize: 9 });

    expect(result.total).toBe(12);
    expect(result.totalPages).toBe(2);
    expect(result.data.map((g) => g.nombre)).toEqual(['Tipo 09', 'Tipo 10', 'Tipo 11']);
  });

  it('las nuevas unidades se suman al tipo existente aunque cambien mayúsculas o espacios', async () => {
    categoria.findUnique.mockResolvedValue({ id: 3, prefijo: 'AND' });
    categoria.update.mockResolvedValue({ ultimoConsecutivo: 11 });
    implemento.findFirst.mockResolvedValue({ nombre: 'Andamio certificado 2 m' });
    (implemento as unknown as { findUnique: jest.Mock }).findUnique = jest
      .fn()
      .mockResolvedValue(null);
    implemento.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    await service.createBatch({
      nombre: '  andamio   CERTIFICADO 2 m ',
      categoriaId: 3,
      precioAlquilerDiario: 28000,
      cantidad: 1,
    });

    expect(implemento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nombre: 'Andamio certificado 2 m' }),
      }),
    );
  });

  it('no permite renombrar un tipo con el nombre de otro existente', async () => {
    implemento.findFirst
      .mockResolvedValueOnce(andamio) // resolveGroupKey
      .mockResolvedValueOnce({ id: 99 }); // choque de nombre

    await expect(
      service.updateGroup({ ...andamio, nuevoNombre: 'Andamio tubular' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(implemento.updateMany).not.toHaveBeenCalled();
  });

  it('actualiza la tarifa de todas las unidades del tipo', async () => {
    implemento.findFirst.mockResolvedValueOnce(andamio);
    implemento.groupBy.mockResolvedValue([]);
    implemento.findMany.mockResolvedValue([]);

    await service.updateGroup({ ...andamio, precioAlquilerDiario: 30000 });

    expect(implemento.updateMany).toHaveBeenCalledWith({
      where: andamio,
      data: { precioAlquilerDiario: 30000 },
    });
  });

  it('no elimina ninguna unidad si alguna tiene historial', async () => {
    implemento.findFirst.mockResolvedValueOnce(andamio);
    implemento.count
      .mockResolvedValueOnce(0) // alquiladas
      .mockResolvedValueOnce(2) // con historial
      .mockResolvedValueOnce(10); // total

    await expect(service.removeGroup(andamio)).rejects.toThrow(
      /2 de 10 unidades tienen historial/,
    );
    expect(implemento.deleteMany).not.toHaveBeenCalled();
  });
});
