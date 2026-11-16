import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

const create = jest.fn();
const findUnique = jest.fn();
const update = jest.fn();
const remove = jest.fn();

const prisma = {
  categoria: {
    create,
    findUnique,
    update,
    delete: remove,
  },
} as unknown as PrismaService;

const service = new CategoriesService(prisma);

const category = {
  id: 1,
  nombre: 'Herramientas eléctricas',
  prefijo: 'HERR',
  ultimoConsecutivo: 3,
  descripcion: null,
  createdAt: new Date(),
  _count: { implementos: 0 },
};

describe('CategoriesService.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normaliza el prefijo a mayúsculas', async () => {
    create.mockResolvedValue(category);

    await service.create({
      nombre: 'Herramientas eléctricas',
      prefijo: ' herr ',
      descripcion: 'Taladros',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        nombre: 'Herramientas eléctricas',
        prefijo: 'HERR',
        descripcion: 'Taladros',
      },
      include: { _count: { select: { implementos: true } } },
    });
  });

  it('convierte el conflicto de prefijo único en un error legible', async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['prefijo'] },
      }),
    );

    await expect(
      service.create({
        nombre: 'Otra categoría',
        prefijo: 'HERR',
      }),
    ).rejects.toThrow(new ConflictException('Ya existe una categoría con ese prefijo.'));
  });
});

describe('CategoriesService.update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite cambiar el prefijo si la categoría no tiene implementos', async () => {
    findUnique.mockResolvedValue({ ...category, _count: { implementos: 0 } });
    update.mockResolvedValue({ ...category, prefijo: 'NEW' });

    await service.update(1, { prefijo: 'new' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { prefijo: 'NEW', ultimoConsecutivo: 0 },
      include: { _count: { select: { implementos: true } } },
    });
  });

  it('bloquea el cambio de prefijo cuando ya existen implementos', async () => {
    findUnique.mockResolvedValue({ ...category, _count: { implementos: 2 } });

    await expect(service.update(1, { prefijo: 'NEW' })).rejects.toThrow(
      new ConflictException(
        'No se puede cambiar el prefijo de una categoría que ya tiene implementos. Los seriales existentes se conservan.',
      ),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('permite guardar el mismo prefijo aunque existan implementos', async () => {
    findUnique.mockResolvedValue({ ...category, _count: { implementos: 2 } });
    update.mockResolvedValue(category);

    await service.update(1, { prefijo: 'herr', descripcion: 'Actualizada' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { descripcion: 'Actualizada' },
      include: { _count: { select: { implementos: true } } },
    });
  });
});
