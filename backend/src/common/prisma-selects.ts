import { Prisma } from '@prisma/client';

/**
 * Proyecciones reutilizadas por varios módulos. Centralizarlas evita que una
 * respuesta exponga campos distintos según el endpoint (hallazgo H-08).
 */
export const userSummary = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
} satisfies Prisma.UsuarioSelect;

export const clientSummary = {
  id: true,
  documentoIdentidad: true,
  nombres: true,
  apellidos: true,
  telefono: true,
  correo: true,
  direccion: true,
} satisfies Prisma.ClienteSelect;

export const itemSummary = {
  id: true,
  codigoSerie: true,
  nombre: true,
  estado: true,
  precioAlquilerDiario: true,
  categoria: { select: { id: true, nombre: true } },
} satisfies Prisma.ImplementoSelect;
