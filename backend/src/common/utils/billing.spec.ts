import { EstadoFactura, Prisma } from '@prisma/client';
import {
  calculateInvoiceTotal,
  invoiceBreakdown,
  nextInvoiceStatus,
  rentalDays,
  settleInvoiceOnReturn,
} from './billing';

const D = (value: string | number) => new Prisma.Decimal(value);

describe('reglas de facturación', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-17T15:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  describe('rentalDays', () => {
    it('cobra mínimo un día cuando se devuelve el mismo día', () => {
      expect(
        rentalDays(new Date('2026-11-17T14:00:00Z'), new Date('2026-11-17T20:00:00Z')),
      ).toBe(1);
    });

    it('usa la diferencia de días calendario del negocio', () => {
      expect(
        rentalDays(new Date('2026-11-17T14:00:00Z'), new Date('2026-11-22T12:00:00Z')),
      ).toBe(5);
    });

    it('no adelanta un día por alquileres registrados en la noche (UTC-5)', () => {
      // 17 nov 9 p. m. Bogotá (18 nov UTC) con devolución pactada el 18 nov.
      expect(
        rentalDays(new Date('2026-11-18T02:00:00Z'), new Date('2026-11-18T12:00:00Z')),
      ).toBe(1);
    });
  });

  it('calcula el total con precisión decimal', () => {
    const total = calculateInvoiceTotal(
      [{ precioUnitario: '12500.50' }, { precioUnitario: D('0.10') }],
      3,
    );
    expect(total.toFixed(2)).toBe('37501.80');
  });

  describe('nextInvoiceStatus', () => {
    it('PAGADA cuando el saldo es cero', () => {
      expect(nextInvoiceStatus(D(0), new Date('2020-01-01T12:00:00Z'))).toBe(
        EstadoFactura.PAGADA,
      );
    });

    it('VENCIDA cuando hay saldo y la fecha ya pasó', () => {
      expect(nextInvoiceStatus(D(10), new Date('2026-11-16T12:00:00Z'))).toBe(
        EstadoFactura.VENCIDA,
      );
    });

    it('PENDIENTE cuando vence hoy', () => {
      expect(nextInvoiceStatus(D(10), new Date('2026-11-17T12:00:00Z'))).toBe(
        EstadoFactura.PENDIENTE,
      );
    });
  });

  describe('settleInvoiceOnReturn', () => {
    const base = {
      fechaAlquiler: new Date('2026-11-10T15:00:00Z'),
      fechaVencimiento: new Date('2026-11-13T12:00:00Z'),
      items: [{ precioUnitario: '10000' }, { precioUnitario: '5000' }],
      totalAnterior: D(45000), // 3 días pactados × 15.000
    };

    it('cobra los días adicionales de una devolución tardía', () => {
      const result = settleInvoiceOnReturn({
        ...base,
        fechaDevolucion: new Date('2026-11-15T16:00:00Z'), // 5 días reales
        saldoAnterior: D(45000),
      });

      expect(result.dias).toBe(5);
      expect(result.total.toFixed(0)).toBe('75000');
      expect(result.saldo.toFixed(0)).toBe('75000');
      expect(result.estado).toBe(EstadoFactura.VENCIDA);
    });

    it('descuenta los pagos ya realizados', () => {
      const result = settleInvoiceOnReturn({
        ...base,
        fechaDevolucion: new Date('2026-11-15T16:00:00Z'),
        saldoAnterior: D(5000), // pagó 40.000
      });

      expect(result.pagado.toFixed(0)).toBe('40000');
      expect(result.saldo.toFixed(0)).toBe('35000');
    });

    it('deja la factura PAGADA si lo pagado cubre una devolución anticipada', () => {
      const result = settleInvoiceOnReturn({
        ...base,
        fechaDevolucion: new Date('2026-11-11T16:00:00Z'), // 1 día real
        saldoAnterior: D(0), // pagó los 3 días
      });

      expect(result.total.toFixed(0)).toBe('15000');
      expect(result.saldo.toFixed(0)).toBe('0');
      expect(result.estado).toBe(EstadoFactura.PAGADA);
    });
  });

  describe('invoiceBreakdown (alquiler + retraso = total)', () => {
    // Hoy: 17 nov 2026 (reloj simulado). Tarifa diaria: 10.000 + 5.000.
    const items = [{ precioUnitario: '10000' }, { precioUnitario: '5000' }];
    const fechaAlquiler = new Date('2026-11-10T15:00:00Z');

    it('dentro del plazo no hay retraso', () => {
      const result = invoiceBreakdown({
        fechaAlquiler,
        fechaPactadaDevolucion: new Date('2026-11-20T12:00:00Z'),
        fechaDevolucion: null,
        items,
        totalGuardado: D(150000),
        saldoGuardado: D(150000),
      });

      expect(result).toMatchObject({
        tarifaDiaria: '15000',
        diasPactados: 10,
        diasAlquiler: 10,
        montoAlquiler: '150000',
        diasRetraso: 0,
        montoRetraso: '0',
        total: '150000',
        saldo: '150000',
        retrasoEnCurso: false,
      });
    });

    it('sin devolver y vencido, el retraso suma un día normal por cada día', () => {
      const result = invoiceBreakdown({
        fechaAlquiler,
        fechaPactadaDevolucion: new Date('2026-11-14T12:00:00Z'), // 4 días pactados
        fechaDevolucion: null,
        items,
        totalGuardado: D(60000),
        saldoGuardado: D(20000), // pagó 40.000
      });

      expect(result).toMatchObject({
        diasPactados: 4,
        montoAlquiler: '60000',
        diasRetraso: 3, // 15, 16 y 17 de noviembre
        montoRetraso: '45000',
        total: '105000',
        pagado: '40000',
        saldo: '65000',
        retrasoEnCurso: true,
      });
    });

    it('devuelto tarde, respeta el total liquidado y separa el retraso', () => {
      const result = invoiceBreakdown({
        fechaAlquiler,
        fechaPactadaDevolucion: new Date('2026-11-14T12:00:00Z'),
        fechaDevolucion: new Date('2026-11-16T20:00:00Z'), // 6 días reales
        items,
        totalGuardado: D(90000),
        saldoGuardado: D(0),
      });

      expect(result).toMatchObject({
        diasAlquiler: 4,
        montoAlquiler: '60000',
        diasRetraso: 2,
        montoRetraso: '30000',
        total: '90000',
        saldo: '0',
        retrasoEnCurso: false,
      });
    });

    it('devuelto antes de tiempo, no hay retraso', () => {
      const result = invoiceBreakdown({
        fechaAlquiler,
        fechaPactadaDevolucion: new Date('2026-11-20T12:00:00Z'),
        fechaDevolucion: new Date('2026-11-12T16:00:00Z'),
        items,
        totalGuardado: D(30000),
        saldoGuardado: D(30000),
      });

      expect(result).toMatchObject({
        diasAlquiler: 2,
        montoRetraso: '0',
        total: '30000',
      });
    });
  });
});
