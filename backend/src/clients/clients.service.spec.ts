import { EstadoFactura, Prisma } from '@prisma/client';
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
    findMany.mockResolvedValue([{ id: 1, facturas: [] }]);
    count.mockResolvedValue(23);

    const result = await service.findAll({ search: 'CC-103', limit: 10 });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
    expect(result).toEqual({
      data: [
        {
          id: 1,
          cartera: { saldoPendiente: '0.00', facturasPendientes: 0, facturasVencidas: 0 },
        },
      ],
      total: 23,
    });
  });

  it('omite el filtro cuando no hay término', async () => {
    await service.findAll({});

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('no escribe en la base de datos al listar (sin mutaciones en GET)', async () => {
    const factura = { updateMany: jest.fn() };
    const readOnlyService = new ClientsService({
      cliente: { findMany, count },
      factura,
    } as unknown as PrismaService);

    await readOnlyService.findAll({});

    expect(factura.updateMany).not.toHaveBeenCalled();
  });

  it('cuenta como vencida una factura con fecha pasada aunque siga guardada como PENDIENTE', async () => {
    findMany.mockResolvedValue([
      {
        id: 7,
        facturas: [
          {
            saldo: new Prisma.Decimal('50000'),
            estado: EstadoFactura.PENDIENTE,
            fechaVencimiento: new Date('2020-01-01T12:00:00.000Z'),
          },
        ],
      },
    ]);
    count.mockResolvedValue(1);

    const result = await service.findAll({});

    expect(result.data[0].cartera).toEqual({
      saldoPendiente: '50000.00',
      facturasPendientes: 1,
      facturasVencidas: 1,
    });
  });
});
