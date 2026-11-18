import type { PendingInvoicesResponse, RentalCarteraAuthorization } from '../types';

/** RF-16: un cliente con al menos una factura con saldo requiere autorización. */
export function requiresCarteraAuthorization(
  pending: Pick<PendingInvoicesResponse, 'cantidad'> | null | undefined,
): boolean {
  return (pending?.cantidad ?? 0) > 0;
}

export interface RentalPayloadInput {
  clienteId: number;
  fechaPactadaDevolucion: string;
  observaciones: string;
  implementoIds: number[];
  authorization?: RentalCarteraAuthorization | null;
  isAdmin: boolean;
}

/**
 * Cuerpo de POST /rentals. Solo se envían los campos que acepta la API
 * (forbidNonWhitelisted) y las credenciales del ADMIN únicamente cuando quien
 * registra es un EMPLEADO.
 */
export function buildRentalPayload(input: RentalPayloadInput) {
  const motivo = input.authorization?.motivo.trim();

  return {
    clienteId: input.clienteId,
    fechaPactadaDevolucion: input.fechaPactadaDevolucion,
    observaciones: input.observaciones.trim() || undefined,
    implementos: input.implementoIds.map((implementoId) => ({ implementoId })),
    ...(motivo
      ? {
          autorizacionCartera: {
            motivo,
            ...(!input.isAdmin
              ? {
                  adminEmail: input.authorization?.adminEmail?.trim(),
                  adminPassword: input.authorization?.adminPassword,
                }
              : {}),
          },
        }
      : {}),
  };
}
