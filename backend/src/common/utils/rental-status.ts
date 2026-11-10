import { PrismaClient } from '@prisma/client';
import { startOfTodayUtc } from './dates';

/**
 * Marca como VENCIDOS los alquileres activos cuya fecha pactada ya pasó.
 * Se ejecuta antes de listar alquileres, devoluciones y reportes.
 */
export async function markOverdueRentals(
  prisma: PrismaClient,
): Promise<number> {
  const result = await prisma.alquiler.updateMany({
    where: {
      estado: 'ACTIVO',
      fechaPactadaDevolucion: { lt: startOfTodayUtc() },
    },
    data: { estado: 'VENCIDO' },
  });

  return result.count;
}
