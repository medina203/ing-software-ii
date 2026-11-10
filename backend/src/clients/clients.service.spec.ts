import type { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from './clients.service';

describe('ClientsService.findAll', () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const prisma = {
    cliente: { findMany, count },
  } as unknown as PrismaService;
  const service = new ClientsService(prisma);

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    count.mockReset().mockResolvedValue(0);
  });

  it('construye una búsqueda insensible por documento y nombre', async () => {
    await service.findAll({ search: '  Carlos   Andrés  ' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            expect.objectContaining({
              documentoIdentidad: {
                contains: 'Carlos Andrés',
                mode: 'insensitive',
              },
            }),
            expect.objectContaining({
              nombres: { contains: 'Carlos Andrés', mode: 'insensitive' },
            }),
            expect.objectContaining({
              apellidos: { contains: 'Carlos Andrés', mode: 'insensitive' },
            }),
          ]),
        },
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({ OR: expect.any(Array) }),
    });
  });

  it('aplica el límite y conserva el total de coincidencias', async () => {
    findMany.mockResolvedValue([{ id: 1 }]);
    count.mockResolvedValue(23);

    const result = await service.findAll({ search: 'CC-103', limit: 10 });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
    expect(result).toEqual({ data: [{ id: 1 }], total: 23 });
  });

  it('omite el filtro cuando no hay término', async () => {
    await service.findAll({});

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});
