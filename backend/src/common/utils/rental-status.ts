import { EstadoAlquiler, EstadoFactura, Prisma } from '@prisma/client';
import { businessDay, startOfBusinessToday } from './dates';

/**
 * Marca como VENCIDOS los alquileres activos cuya fecha pactada ya pasó.
 * Solo se invoca desde el proceso programado (StatusSyncService) y desde
 * operaciones de escritura; las consultas GET no modifican la base de datos.
 */
export async function markOverdueRentals(
  prisma: Prisma.TransactionClient,
): Promise<number> {
  const result = await prisma.alquiler.updateMany({
    where: {
      estado: EstadoAlquiler.ACTIVO,
      fechaPactadaDevolucion: { lt: startOfBusinessToday() },
    },
    data: { estado: EstadoAlquiler.VENCIDO },
  });

  return result.count;
}

/** Estado efectivo de un alquiler a la fecha actual, sin depender de la sincronización. */
export function effectiveRentalStatus(
  estado: EstadoAlquiler,
  fechaPactadaDevolucion: Date,
): EstadoAlquiler {
  if (
    estado === EstadoAlquiler.ACTIVO &&
    businessDay(fechaPactadaDevolucion) < startOfBusinessToday()
  ) {
    return EstadoAlquiler.VENCIDO;
  }
  return estado;
}

/** Filtro por estado efectivo de alquiler (equivalente a effectiveRentalStatus). */
export function rentalStatusWhere(estado: EstadoAlquiler): Prisma.AlquilerWhereInput {
  const today = startOfBusinessToday();
  switch (estado) {
    case EstadoAlquiler.VENCIDO:
      return {
        OR: [
          { estado: EstadoAlquiler.VENCIDO },
          { estado: EstadoAlquiler.ACTIVO, fechaPactadaDevolucion: { lt: today } },
        ],
      };
    case EstadoAlquiler.ACTIVO:
      return { estado: EstadoAlquiler.ACTIVO, fechaPactadaDevolucion: { gte: today } };
    default:
      return { estado };
  }
}

/** Filtro por estado efectivo de factura. */
export function invoiceStatusWhere(estado: EstadoFactura): Prisma.FacturaWhereInput {
  const today = startOfBusinessToday();
  switch (estado) {
    case EstadoFactura.VENCIDA:
      return {
        saldo: { gt: 0 },
        OR: [
          { estado: EstadoFactura.VENCIDA },
          { estado: EstadoFactura.PENDIENTE, fechaVencimiento: { lt: today } },
        ],
      };
    case EstadoFactura.PENDIENTE:
      return { estado: EstadoFactura.PENDIENTE, fechaVencimiento: { gte: today } };
    default:
      return { estado };
  }
}

/** Aplica el estado efectivo a un alquiler devuelto por Prisma. */
export function withEffectiveRentalStatus<
  T extends { estado: EstadoAlquiler; fechaPactadaDevolucion: Date },
>(alquiler: T): T {
  return {
    ...alquiler,
    estado: effectiveRentalStatus(alquiler.estado, alquiler.fechaPactadaDevolucion),
  };
}
