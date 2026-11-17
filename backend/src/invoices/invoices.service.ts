import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoFactura, Prisma } from '@prisma/client';
import {
  getPendingInvoices,
  markOverdueInvoices,
  nextInvoiceStatus,
  withEffectiveInvoiceStatus,
} from '../common/utils/billing';
import { invoiceStatusWhere } from '../common/utils/rental-status';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { userSummary, clientSummary } from '../common/prisma-selects';

const invoiceInclude = {
  cliente: { select: clientSummary },
  alquiler: {
    select: {
      id: true,
      codigoAlquiler: true,
      fechaAlquiler: true,
      fechaPactadaDevolucion: true,
      estado: true,
    },
  },
  pagos: {
    include: { usuario: { select: userSummary } },
    orderBy: { fechaPago: 'desc' },
  },
} satisfies Prisma.FacturaInclude;

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListInvoicesQueryDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const term = query.search?.trim();

    const where: Prisma.FacturaWhereInput = {
      ...(query.clienteId ? { clienteId: query.clienteId } : {}),
      AND: [
        query.estado ? invoiceStatusWhere(query.estado) : {},
        term
          ? {
              OR: [
                {
                  codigoFactura: { contains: term, mode: 'insensitive' },
                },
                {
                  cliente: {
                    documentoIdentidad: { contains: term, mode: 'insensitive' },
                  },
                },
                {
                  cliente: {
                    nombres: { contains: term, mode: 'insensitive' },
                  },
                },
                {
                  cliente: {
                    apellidos: { contains: term, mode: 'insensitive' },
                  },
                },
                {
                  alquiler: {
                    codigoAlquiler: { contains: term, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {},
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.factura.findMany({
        where,
        include: invoiceInclude,
        orderBy: [{ fechaEmision: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.factura.count({ where }),
    ]);

    return {
      data: rows.map((row) => withEffectiveInvoiceStatus(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const factura = await this.prisma.factura.findUnique({
      where: { id },
      include: invoiceInclude,
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada.');
    }

    return withEffectiveInvoiceStatus(factura);
  }

  async findPendingByClient(clienteId: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        documentoIdentidad: true,
        nombres: true,
        apellidos: true,
        telefono: true,
        correo: true,
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const pending = await getPendingInvoices(this.prisma, clienteId);

    return {
      cliente,
      clienteId,
      ...pending,
    };
  }

  async createPayment(facturaId: number, dto: CreatePaymentDto, usuarioId: number) {
    await markOverdueInvoices(this.prisma);

    const monto = new Prisma.Decimal(dto.monto);
    if (monto.lte(0)) {
      throw new BadRequestException('El monto del pago debe ser mayor que cero.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const factura = await tx.factura.findUnique({
          where: { id: facturaId },
          select: {
            id: true,
            saldo: true,
            estado: true,
            fechaVencimiento: true,
          },
        });

        if (!factura) {
          throw new NotFoundException('Factura no encontrada.');
        }

        if (factura.estado === EstadoFactura.PAGADA || factura.saldo.lte(0)) {
          throw new ConflictException('La factura ya está pagada.');
        }

        if (monto.gt(factura.saldo)) {
          throw new BadRequestException(
            `El monto no puede superar el saldo pendiente de ${factura.saldo.toFixed(2)}.`,
          );
        }

        const updated = await tx.factura.updateMany({
          where: {
            id: facturaId,
            estado: {
              in: [EstadoFactura.PENDIENTE, EstadoFactura.VENCIDA],
            },
            saldo: { gte: monto },
          },
          data: { saldo: { decrement: monto } },
        });

        if (updated.count === 0) {
          throw new ConflictException(
            'El saldo de la factura cambió mientras se registraba el pago. Actualice e intente nuevamente.',
          );
        }

        const after = await tx.factura.findUniqueOrThrow({
          where: { id: facturaId },
          select: { saldo: true, fechaVencimiento: true },
        });

        await tx.factura.update({
          where: { id: facturaId },
          data: {
            estado: nextInvoiceStatus(after.saldo, after.fechaVencimiento),
          },
        });

        await tx.pago.create({
          data: {
            facturaId,
            usuarioId,
            monto,
            metodoPago: dto.metodoPago,
            referencia: dto.referencia?.trim() || null,
          },
        });

        return tx.factura.findUniqueOrThrow({
          where: { id: facturaId },
          include: invoiceInclude,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  }
}
