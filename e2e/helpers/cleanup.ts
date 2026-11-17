import type { PrismaClient } from '@prisma/client';

/** Borra alquileres de prueba con autorizaciones, pagos, facturas y devoluciones. */
export async function deleteRentalsCascade(
  prisma: PrismaClient,
  rentalIds: number[],
): Promise<void> {
  if (rentalIds.length === 0) return;
  const facturas = await prisma.factura.findMany({
    where: { alquilerId: { in: rentalIds } },
    select: { id: true },
  });
  const facturaIds = facturas.map((factura) => factura.id);
  await prisma.autorizacionCartera.deleteMany({
    where: { OR: [{ alquilerId: { in: rentalIds } }, { facturaId: { in: facturaIds } }] },
  });
  await prisma.pago.deleteMany({ where: { facturaId: { in: facturaIds } } });
  await prisma.factura.deleteMany({ where: { id: { in: facturaIds } } });
  await prisma.devolucion.deleteMany({ where: { alquilerId: { in: rentalIds } } });
  await prisma.alquiler.deleteMany({ where: { id: { in: rentalIds } } });
}
