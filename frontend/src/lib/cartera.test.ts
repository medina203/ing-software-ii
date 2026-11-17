import { describe, expect, it } from 'vitest';
import { buildRentalPayload, requiresCarteraAuthorization } from './cartera';

describe('reglas de cartera en el alquiler (RF-16)', () => {
  it('exige autorización solo cuando hay facturas con saldo', () => {
    expect(requiresCarteraAuthorization(null)).toBe(false);
    expect(requiresCarteraAuthorization({ cantidad: 0 })).toBe(false);
    expect(requiresCarteraAuthorization({ cantidad: 2 })).toBe(true);
  });

  it('arma el cuerpo sin campos extra que la API rechazaría', () => {
    const payload = buildRentalPayload({
      clienteId: 4,
      fechaPactadaDevolucion: '2026-11-20',
      observaciones: '  ',
      implementoIds: [10, 11],
      isAdmin: false,
    });

    expect(payload).toEqual({
      clienteId: 4,
      fechaPactadaDevolucion: '2026-11-20',
      observaciones: undefined,
      implementos: [{ implementoId: 10 }, { implementoId: 11 }],
    });
  });

  it('un EMPLEADO envía motivo y credenciales del ADMIN', () => {
    const payload = buildRentalPayload({
      clienteId: 4,
      fechaPactadaDevolucion: '2026-11-20',
      observaciones: 'Obra norte',
      implementoIds: [10],
      isAdmin: false,
      authorization: {
        motivo: ' Pago comprometido ',
        adminEmail: ' admin@obragest.local ',
        adminPassword: 'secreto',
      },
    });

    expect(payload.autorizacionCartera).toEqual({
      motivo: 'Pago comprometido',
      adminEmail: 'admin@obragest.local',
      adminPassword: 'secreto',
    });
  });

  it('un ADMIN solo envía el motivo', () => {
    const payload = buildRentalPayload({
      clienteId: 4,
      fechaPactadaDevolucion: '2026-11-20',
      observaciones: '',
      implementoIds: [10],
      isAdmin: true,
      authorization: {
        motivo: 'Cliente estratégico',
        adminEmail: 'x@y.z',
        adminPassword: 'p',
      },
    });

    expect(payload.autorizacionCartera).toEqual({ motivo: 'Cliente estratégico' });
  });
});
