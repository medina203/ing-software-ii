import { Rol } from '@prisma/client';

export interface AuthenticatedUser {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

export interface JwtPayload {
  sub: number;
  email: string;
  rol: Rol;
  iat?: number;
  exp?: number;
}
