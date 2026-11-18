import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoFactura, Prisma } from '@prisma/client';
import { nextInvoiceStatus } from '../common/utils/billing';
import { normalizeSearchTerm } from '../common/utils/search';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const pendingInvoiceSelect = {
  id: true,
  codigoFactura: true,
  saldo: true,
  estado: true,
  fechaVencimiento: true,
} satisfies Prisma.FacturaSelect;

function summarizeCartera(
  facturas: Array<{
    saldo: Prisma.Decimal;
    estado: EstadoFactura;
    fechaVencimiento: Date;
  }>,
) {
  const saldoPendiente = facturas.reduce(
    (total, factura) => total.plus(factura.saldo),
    new Prisma.Decimal(0),
  );

  return {
    saldoPendiente: saldoPendiente.toFixed(2),
    facturasPendientes: facturas.length,
    facturasVencidas: facturas.filter(
      (factura) =>
        nextInvoiceStatus(factura.saldo, factura.fechaVencimiento) ===
        EstadoFactura.VENCIDA,
    ).length,
  };
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListClientsQueryDto = {}) {
    const term = normalizeSearchTerm(query.search);
    const where: Prisma.ClienteWhereInput = term
      ? {
          OR: [
            { documentoIdentidad: { contains: term, mode: 'insensitive' } },
            { nombres: { contains: term, mode: 'insensitive' } },
            { apellidos: { contains: term, mode: 'insensitive' } },
            { telefono: { contains: term, mode: 'insensitive' } },
            { correo: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};

    const [clientes, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        include: {
          _count: { select: { alquileres: true } },
          facturas: {
            where: {
              estado: { in: [EstadoFactura.PENDIENTE, EstadoFactura.VENCIDA] },
              saldo: { gt: 0 },
            },
            select: pendingInvoiceSelect,
            orderBy: [{ fechaVencimiento: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
        ...(query.limit ? { take: query.limit } : {}),
      }),
      this.prisma.cliente.count({ where }),
    ]);

    const data = clientes.map(({ facturas, ...cliente }) => ({
      ...cliente,
      cartera: summarizeCartera(facturas),
    }));

    return { data, total };
  }

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        _count: { select: { alquileres: true } },
        facturas: {
          where: {
            estado: { in: [EstadoFactura.PENDIENTE, EstadoFactura.VENCIDA] },
            saldo: { gt: 0 },
          },
          select: pendingInvoiceSelect,
          orderBy: [{ fechaVencimiento: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const { facturas, ...data } = cliente;
    return {
      ...data,
      cartera: summarizeCartera(facturas),
    };
  }

  async create(dto: CreateClientDto) {
    return this.prisma.cliente.create({
      data: {
        documentoIdentidad: dto.documentoIdentidad.trim(),
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        telefono: dto.telefono.trim(),
        correo: dto.correo?.trim().toLowerCase() || null,
        direccion: dto.direccion?.trim() || null,
      },
      include: {
        _count: { select: { alquileres: true } },
      },
    });
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findOne(id);

    const data: Prisma.ClienteUpdateInput = {};
    if (dto.documentoIdentidad !== undefined) {
      data.documentoIdentidad = dto.documentoIdentidad.trim();
    }
    if (dto.nombres !== undefined) data.nombres = dto.nombres.trim();
    if (dto.apellidos !== undefined) data.apellidos = dto.apellidos.trim();
    if (dto.telefono !== undefined) data.telefono = dto.telefono.trim();
    if (dto.correo !== undefined) {
      data.correo = dto.correo.trim().toLowerCase() || null;
    }
    if (dto.direccion !== undefined) {
      data.direccion = dto.direccion.trim() || null;
    }

    return this.prisma.cliente.update({
      where: { id },
      data,
      include: {
        _count: { select: { alquileres: true } },
      },
    });
  }

  async remove(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: { _count: { select: { alquileres: true } } },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    if (cliente._count.alquileres > 0) {
      throw new ConflictException(
        'No se puede eliminar el cliente porque tiene alquileres asociados.',
      );
    }

    await this.prisma.cliente.delete({ where: { id } });
    return { message: 'Cliente eliminado correctamente.' };
  }
}
