import { EstadoFactura, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { startOfTodayUtc, yyyymmdd } from './dates';

const MS_PER_DAY = 86_400_000;

export interface InvoiceRentalItem {
  precioUnitario: Prisma.Decimal | string | number;
}

export interface PendingInvoiceItem {
  id: number;
  codigoFactura: string;
  alquilerId: number;
  total: Prisma.Decimal;
  saldo: Prisma.Decimal;
  estado: EstadoFactura;
  fechaVencimiento: Date;
  alquiler: { codigoAlquiler: string };
}

export interface PendingInvoicesResult {
  facturas: PendingInvoiceItem[];
  totalSaldo: Prisma.Decimal;
  cantidad: number;
  vencidas: number;
}

export function rentalDays(start: Date, end: Date): number {
  const startDay = new Date(start);
  startDay.setUTCHours(0, 0, 0, 0);

  const endDay = new Date(end);
  endDay.setUTCHours(0, 0, 0, 0);

  return Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / MS_PER_DAY));
}

export function calculateInvoiceTotal(
  items: InvoiceRentalItem[],
  days: number,
): Prisma.Decimal {
  return items.reduce(
    (total, item) => total.plus(new Prisma.Decimal(item.precioUnitario).times(days)),
    new Prisma.Decimal(0),
  );
}

export function nextInvoiceStatus(
  saldo: Prisma.Decimal,
  fechaVencimiento: Date,
): EstadoFactura {
  if (saldo.lte(0)) return EstadoFactura.PAGADA;
  if (fechaVencimiento < startOfTodayUtc()) return EstadoFactura.VENCIDA;
  return EstadoFactura.PENDIENTE;
}

export async function createInvoiceForRental(
  tx: Prisma.TransactionClient,
  params: {
    alquilerId: number;
    clienteId: number;
    fechaEmision: Date;
    fechaVencimiento: Date;
    items: InvoiceRentalItem[];
  },
) {
  const days = rentalDays(params.fechaEmision, params.fechaVencimiento);
  const total = calculateInvoiceTotal(params.items, days);

  const temporal = await tx.factura.create({
    data: {
      codigoFactura: `TMP-${randomUUID()}`,
      alquilerId: params.alquilerId,
      clienteId: params.clienteId,
      fechaEmision: params.fechaEmision,
      fechaVencimiento: params.fechaVencimiento,
      total,
      saldo: total,
      estado: EstadoFactura.PENDIENTE,
    },
  });

  return tx.factura.update({
    where: { id: temporal.id },
    data: {
      codigoFactura: `FAC-${yyyymmdd(params.fechaEmision)}-${String(temporal.id).padStart(
        5,
        '0',
      )}`,
    },
  });
}

export async function markOverdueInvoices(
  prisma: Prisma.TransactionClient,
): Promise<number> {
  const result = await prisma.factura.updateMany({
    where: {
      estado: EstadoFactura.PENDIENTE,
      fechaVencimiento: { lt: startOfTodayUtc() },
      saldo: { gt: 0 },
    },
    data: { estado: EstadoFactura.VENCIDA },
  });

  return result.count;
}

export async function getPendingInvoices(
  prisma: Prisma.TransactionClient,
  clienteId: number,
): Promise<PendingInvoicesResult> {
  const facturas = await prisma.factura.findMany({
    where: {
      clienteId,
      estado: { in: [EstadoFactura.PENDIENTE, EstadoFactura.VENCIDA] },
      saldo: { gt: 0 },
    },
    orderBy: [{ fechaVencimiento: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      codigoFactura: true,
      alquilerId: true,
      total: true,
      saldo: true,
      estado: true,
      fechaVencimiento: true,
      alquiler: { select: { codigoAlquiler: true } },
    },
  });

  const totalSaldo = facturas.reduce(
    (total, factura) => total.plus(factura.saldo),
    new Prisma.Decimal(0),
  );

  return {
    facturas,
    totalSaldo,
    cantidad: facturas.length,
    vencidas: facturas.filter((factura) => factura.estado === EstadoFactura.VENCIDA)
      .length,
  };
}
