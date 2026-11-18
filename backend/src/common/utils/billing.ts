import { EstadoFactura, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  businessDay,
  businessDaysBetween,
  startOfBusinessToday,
  yyyymmdd,
} from './dates';

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

/**
 * Días facturables de un alquiler: diferencia de días calendario del negocio,
 * con un mínimo de 1. Es la misma regla que usan la factura, el ajuste en la
 * devolución, el reporte de ingresos y la interfaz.
 */
export function rentalDays(start: Date, end: Date): number {
  return Math.max(1, businessDaysBetween(start, end));
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
  if (businessDay(fechaVencimiento) < startOfBusinessToday())
    return EstadoFactura.VENCIDA;
  return EstadoFactura.PENDIENTE;
}

export interface ReturnSettlement {
  dias: number;
  total: Prisma.Decimal;
  pagado: Prisma.Decimal;
  saldo: Prisma.Decimal;
  estado: EstadoFactura;
}

/**
 * Liquida la factura al registrar la devolución: el total se recalcula con
 * los días reales (devolución tardía o anticipada) y el saldo descuenta lo ya
 * pagado. El saldo nunca es negativo; un eventual saldo a favor del cliente no
 * se modela en esta versión.
 */
export function settleInvoiceOnReturn(params: {
  fechaAlquiler: Date;
  fechaDevolucion: Date;
  fechaVencimiento: Date;
  items: InvoiceRentalItem[];
  totalAnterior: Prisma.Decimal;
  saldoAnterior: Prisma.Decimal;
}): ReturnSettlement {
  const dias = rentalDays(params.fechaAlquiler, params.fechaDevolucion);
  const total = calculateInvoiceTotal(params.items, dias);
  const pagado = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    params.totalAnterior.minus(params.saldoAnterior),
  );
  const saldo = Prisma.Decimal.max(new Prisma.Decimal(0), total.minus(pagado));

  return {
    dias,
    total,
    pagado,
    saldo,
    estado: nextInvoiceStatus(saldo, params.fechaVencimiento),
  };
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
      fechaVencimiento: { lt: startOfBusinessToday() },
      saldo: { gt: 0 },
    },
    data: { estado: EstadoFactura.VENCIDA },
  });

  return result.count;
}

/**
 * Facturas con saldo del cliente. El estado VENCIDA se deriva de la fecha y no
 * del valor guardado, para que la consulta sea correcta aunque el proceso
 * programado aún no haya actualizado la base de datos.
 */
export async function getPendingInvoices(
  prisma: Prisma.TransactionClient,
  clienteId: number,
): Promise<PendingInvoicesResult> {
  const rows = await prisma.factura.findMany({
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

  const facturas = rows.map((factura) => ({
    ...factura,
    estado: nextInvoiceStatus(factura.saldo, factura.fechaVencimiento),
  }));

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

/** Aplica el estado efectivo (VENCIDA por fecha) a una factura devuelta por Prisma. */
export function withEffectiveInvoiceStatus<
  T extends { estado: EstadoFactura; saldo: Prisma.Decimal; fechaVencimiento: Date },
>(factura: T): T {
  return {
    ...factura,
    estado: nextInvoiceStatus(factura.saldo, factura.fechaVencimiento),
  };
}

/** Desglose de la factura de un alquiler: días pactados, retraso, total y saldo. */
export interface InvoiceBreakdown {
  tarifaDiaria: string;
  diasPactados: number;
  /** Días cobrados como alquiler normal dentro del plazo pactado. */
  diasAlquiler: number;
  montoAlquiler: string;
  /** Días después de la fecha pactada (se cobran a la misma tarifa diaria). */
  diasRetraso: number;
  montoRetraso: string;
  total: string;
  pagado: string;
  saldo: string;
  /** true mientras los equipos no se han devuelto y el retraso sigue sumando. */
  retrasoEnCurso: boolean;
}

export interface BreakdownInput {
  fechaAlquiler: Date;
  fechaPactadaDevolucion: Date;
  fechaDevolucion: Date | null;
  items: InvoiceRentalItem[];
  totalGuardado: Prisma.Decimal;
  saldoGuardado: Prisma.Decimal;
}

/**
 * Calcula el desglose a la fecha. Si los equipos ya se devolvieron, respeta el
 * total liquidado; si siguen afuera después de la fecha pactada, el retraso
 * se acumula día a día a la tarifa normal (sin escribir en la base de datos).
 */
export function invoiceBreakdown(
  input: BreakdownInput,
  now = new Date(),
): InvoiceBreakdown {
  const tarifa = calculateInvoiceTotal(input.items, 1);
  const diasPactados = rentalDays(input.fechaAlquiler, input.fechaPactadaDevolucion);
  const devuelto = input.fechaDevolucion !== null;
  const diasReales = rentalDays(input.fechaAlquiler, input.fechaDevolucion ?? now);
  const diasCobrados = devuelto ? diasReales : Math.max(diasPactados, diasReales);
  const diasRetraso = Math.max(0, diasCobrados - diasPactados);
  const montoRetraso = tarifa.times(diasRetraso);

  const pagado = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    input.totalGuardado.minus(input.saldoGuardado),
  );
  // Devuelto: el total liquidado es la referencia. Abierto: tarifa × días a la fecha.
  const total = devuelto ? input.totalGuardado : tarifa.times(diasCobrados);
  const montoAlquiler = Prisma.Decimal.max(
    new Prisma.Decimal(0),
    total.minus(montoRetraso),
  );
  const saldo = Prisma.Decimal.max(new Prisma.Decimal(0), total.minus(pagado));

  return {
    tarifaDiaria: tarifa.toString(),
    diasPactados,
    diasAlquiler: diasCobrados - diasRetraso,
    montoAlquiler: montoAlquiler.toString(),
    diasRetraso,
    montoRetraso: montoRetraso.toString(),
    total: total.toString(),
    pagado: pagado.toString(),
    saldo: saldo.toString(),
    retrasoEnCurso: !devuelto && diasRetraso > 0,
  };
}

/** Datos del alquiler que necesita el desglose de su factura. */
export const breakdownRentalSelect = {
  fechaAlquiler: true,
  fechaPactadaDevolucion: true,
  devolucion: { select: { fechaDevolucion: true } },
  detalles: { select: { precioUnitario: true } },
} satisfies Prisma.AlquilerSelect;

type BreakdownRental = Prisma.AlquilerGetPayload<{
  select: typeof breakdownRentalSelect;
}>;

/**
 * Factura lista para mostrar: total, saldo y estado efectivos (incluyen el
 * retraso acumulado) y su desglose.
 */
export function presentInvoice<
  T extends {
    estado: EstadoFactura;
    total: Prisma.Decimal;
    saldo: Prisma.Decimal;
    fechaVencimiento: Date;
  },
>(factura: T, alquiler: BreakdownRental, now = new Date()) {
  const desglose = invoiceBreakdown(
    {
      fechaAlquiler: alquiler.fechaAlquiler,
      fechaPactadaDevolucion: alquiler.fechaPactadaDevolucion,
      fechaDevolucion: alquiler.devolucion?.fechaDevolucion ?? null,
      items: alquiler.detalles,
      totalGuardado: factura.total,
      saldoGuardado: factura.saldo,
    },
    now,
  );
  const saldo = new Prisma.Decimal(desglose.saldo);
  return {
    ...factura,
    total: new Prisma.Decimal(desglose.total),
    saldo,
    estado: nextInvoiceStatus(saldo, factura.fechaVencimiento),
    desglose,
  };
}

/**
 * Persiste el retraso acumulado de las facturas de alquileres vencidos sin
 * devolución, para que la cartera, los pagos y la autorización usen el saldo
 * real. Se ejecuta en el proceso programado y antes de operaciones de escritura.
 */
export async function accrueOverdueInvoices(
  prisma: Prisma.TransactionClient,
  facturaId?: number,
): Promise<number> {
  const rows = await prisma.factura.findMany({
    where: {
      ...(facturaId ? { id: facturaId } : {}),
      alquiler: {
        devolucion: null,
        fechaPactadaDevolucion: { lt: startOfBusinessToday() },
      },
    },
    select: {
      id: true,
      total: true,
      saldo: true,
      fechaVencimiento: true,
      alquiler: { select: breakdownRentalSelect },
    },
  });

  let updated = 0;
  for (const row of rows) {
    const presented = presentInvoice(
      { ...row, estado: EstadoFactura.PENDIENTE },
      row.alquiler,
    );
    if (presented.total.equals(row.total) && presented.saldo.equals(row.saldo)) continue;
    await prisma.factura.update({
      where: { id: row.id },
      data: { total: presented.total, saldo: presented.saldo, estado: presented.estado },
    });
    updated += 1;
  }
  return updated;
}
