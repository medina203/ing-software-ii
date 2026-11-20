import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

const IP_PATTERN = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * IP real del cliente, usada para limitar intentos de login y de recuperación.
 *
 * Detrás de un proxy, `req.ip` con `trust proxy = 1` puede devolver la IP de un
 * salto intermedio (en Railway, la del CDN): todos los usuarios compartirían la
 * misma "IP" y el límite de uno bloquearía a los demás. Si CLIENT_IP_HEADER está
 * definida (en Railway: `x-real-ip`, que su borde siempre sobrescribe con la IP
 * del cliente), se usa ese encabezado. Solo debe activarse cuando el proxy lo
 * sobrescribe; si no, un cliente podría falsificarlo.
 */
export function resolveClientIp(
  request: Pick<Request, 'ip' | 'headers'>,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const headerName = env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (headerName) {
    const raw = request.headers[headerName];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim();
    if (value && IP_PATTERN.test(value)) return value;
  }
  return request.ip || 'desconocida';
}

export const ClientIp = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    resolveClientIp(context.switchToHttp().getRequest<Request>()),
);
