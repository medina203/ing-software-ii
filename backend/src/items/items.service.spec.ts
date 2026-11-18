import { BadRequestException } from '@nestjs/common';
import { EstadoImplemento } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from './items.service';

const tx = {
  categoria: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  implemento: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(async () => null),
    update: jest.fn(),
  },
};

const transaction = jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
  callback(tx),
);
const findItem = jest.fn();
const updateItem = jest.fn();

const prisma = {
  $transaction: transaction,
  implemento: {
    findUnique: findItem,
    update: updateItem,
  },
} as unknown as PrismaService;

const service = new ItemsService(prisma);

const baseItem = {
  id: 1,
  codigoSerie: 'HERR-004',
  nombre: 'Taladro',
  categoriaId: 1,
  descripcion: null,
  precioAlquilerDiario: '45000',
  estado: EstadoImplemento.DISPONIBLE,
  categoria: { id: 1, nombre: 'Herramientas eléctricas' },
};

describe('ItemsService.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );
    tx.categoria.findUnique.mockResolvedValue({
      id: 1,
      prefijo: 'HERR',
    });
    tx.categoria.update.mockResolvedValue({ ultimoConsecutivo: 4 });
    tx.implemento.findUnique.mockResolvedValue(null);
    tx.implemento.create.mockResolvedValue(baseItem);
  });

  it('genera el serial con el prefijo y el consecutivo de la categoría', async () => {
    const result = await service.create({
      nombre: 'Taladro',
      categoriaId: 1,
      precioAlquilerDiario: 45000,
    });

    expect(tx.categoria.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ultimoConsecutivo: { increment: 1 } },
      select: { ultimoConsecutivo: true },
    });
    expect(tx.implemento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          codigoSerie: 'HERR-004',
          nombre: 'Taladro',
          categoriaId: 1,
        }),
      }),
    );
    expect(result).toBe(baseItem);
  });

  it('salta un consecutivo si el serial ya existe', async () => {
    tx.categoria.update
      .mockResolvedValueOnce({ ultimoConsecutivo: 1 })
      .mockResolvedValueOnce({ ultimoConsecutivo: 2 });
    tx.implemento.findUnique
      .mockResolvedValueOnce({ id: 99 })
      .mockResolvedValueOnce(null);

    await service.create({
      nombre: 'Taladro',
      categoriaId: 1,
      precioAlquilerDiario: 45000,
    });

    expect(tx.implemento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ codigoSerie: 'HERR-002' }),
      }),
    );
  });

  it('rechaza una categoría inexistente', async () => {
    tx.categoria.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        nombre: 'Taladro',
        categoriaId: 99,
        precioAlquilerDiario: 45000,
      }),
    ).rejects.toThrow(new BadRequestException('La categoría seleccionada no existe.'));
    expect(tx.implemento.create).not.toHaveBeenCalled();
  });

  it('no permite crear implementos con estado ALQUILADO', async () => {
    await expect(
      service.create({
        nombre: 'Taladro',
        categoriaId: 1,
        precioAlquilerDiario: 45000,
        estado: EstadoImplemento.ALQUILADO,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('ItemsService.createBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );
    tx.categoria.findUnique.mockResolvedValue({
      id: 1,
      prefijo: 'HERR',
    });
    tx.categoria.update
      .mockResolvedValueOnce({ ultimoConsecutivo: 1 })
      .mockResolvedValueOnce({ ultimoConsecutivo: 2 })
      .mockResolvedValueOnce({ ultimoConsecutivo: 3 });
    tx.implemento.findUnique.mockResolvedValue(null);
    tx.implemento.create.mockImplementation(
      ({ data }: { data: { codigoSerie: string; nombre: string } }) =>
        Promise.resolve({
          ...baseItem,
          id: Number(data.codigoSerie.slice(-3)),
          codigoSerie: data.codigoSerie,
          nombre: data.nombre,
        }),
    );
  });

  it('crea varias unidades con seriales consecutivos en una sola transacción', async () => {
    const result = await service.createBatch({
      nombre: 'Andamio',
      categoriaId: 1,
      precioAlquilerDiario: 45000,
      cantidad: 3,
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.implemento.create).toHaveBeenCalledTimes(3);
    expect(result.total).toBe(3);
    expect(result.items.map((item) => item.codigoSerie)).toEqual([
      'HERR-001',
      'HERR-002',
      'HERR-003',
    ]);
  });
});

describe('ItemsService.update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );
    findItem.mockReset().mockResolvedValue(baseItem);
    updateItem.mockReset().mockResolvedValue(baseItem);
    tx.implemento.update.mockResolvedValue(baseItem);
    tx.categoria.updateMany.mockResolvedValue({ count: 0 });
  });

  it('actualiza datos sin tocar el serial', async () => {
    await service.update(1, { nombre: 'Taladro actualizado' });

    expect(updateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { nombre: 'Taladro actualizado' },
      }),
    );
  });

  it('eleva el consecutivo de la categoría destino si el serial ya usa su prefijo', async () => {
    findItem.mockResolvedValue({
      ...baseItem,
      codigoSerie: 'MAQ-007',
    });
    tx.categoria.findUnique.mockResolvedValue({
      id: 2,
      prefijo: 'MAQ',
      ultimoConsecutivo: 3,
    });

    await service.update(1, { categoriaId: 2 });

    expect(tx.categoria.updateMany).toHaveBeenCalledWith({
      where: {
        id: 2,
        ultimoConsecutivo: { lt: 7 },
      },
      data: { ultimoConsecutivo: 7 },
    });
    expect(tx.implemento.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { categoria: { connect: { id: 2 } } },
      }),
    );
  });

  it('no eleva el consecutivo si el serial no coincide con la categoría destino', async () => {
    tx.categoria.findUnique.mockResolvedValue({
      id: 2,
      prefijo: 'MAQ',
      ultimoConsecutivo: 3,
    });

    await service.update(1, { categoriaId: 2 });

    expect(tx.categoria.updateMany).not.toHaveBeenCalled();
  });
});
