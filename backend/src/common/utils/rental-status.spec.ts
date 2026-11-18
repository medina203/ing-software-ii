import { EstadoAlquiler, EstadoFactura } from '@prisma/client';
import {
  effectiveRentalStatus,
  invoiceStatusWhere,
  rentalStatusWhere,
} from './rental-status';

describe('estado efectivo de alquileres y facturas', () => {
  beforeEach(() => {
    // 17 nov 2026, 8 p. m. en Bogotá (ya es 18 nov en UTC).
    jest.useFakeTimers().setSystemTime(new Date('2026-11-18T01:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('un alquiler ACTIVO con fecha pasada se presenta como VENCIDO', () => {
    expect(
      effectiveRentalStatus(EstadoAlquiler.ACTIVO, new Date('2026-11-16T12:00:00Z')),
    ).toBe(EstadoAlquiler.VENCIDO);
  });

  it('un alquiler que vence hoy (hora Bogotá) sigue ACTIVO en la noche', () => {
    expect(
      effectiveRentalStatus(EstadoAlquiler.ACTIVO, new Date('2026-11-17T12:00:00Z')),
    ).toBe(EstadoAlquiler.ACTIVO);
  });

  it('no altera alquileres FINALIZADOS', () => {
    expect(
      effectiveRentalStatus(EstadoAlquiler.FINALIZADO, new Date('2020-01-01T12:00:00Z')),
    ).toBe(EstadoAlquiler.FINALIZADO);
  });

  it('el filtro VENCIDO incluye activos con fecha pasada', () => {
    expect(rentalStatusWhere(EstadoAlquiler.VENCIDO)).toEqual({
      OR: [
        { estado: EstadoAlquiler.VENCIDO },
        {
          estado: EstadoAlquiler.ACTIVO,
          fechaPactadaDevolucion: { lt: new Date('2026-11-17T00:00:00.000Z') },
        },
      ],
    });
  });

  it('el filtro ACTIVO excluye activos con fecha pasada', () => {
    expect(rentalStatusWhere(EstadoAlquiler.ACTIVO)).toEqual({
      estado: EstadoAlquiler.ACTIVO,
      fechaPactadaDevolucion: { gte: new Date('2026-11-17T00:00:00.000Z') },
    });
  });

  it('el filtro de facturas VENCIDA incluye pendientes con fecha pasada y saldo', () => {
    expect(invoiceStatusWhere(EstadoFactura.VENCIDA)).toMatchObject({
      saldo: { gt: 0 },
      OR: expect.arrayContaining([{ estado: EstadoFactura.VENCIDA }]),
    });
  });
});
