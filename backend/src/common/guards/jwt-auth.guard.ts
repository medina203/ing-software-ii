import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../types/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Token de acceso no proporcionado o formato inválido.',
      );
    }

    const token = authorization.slice(7).trim();

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          activo: true,
        },
      });

      if (!usuario?.activo) {
        throw new UnauthorizedException(
          'El usuario no existe o se encuentra inactivo.',
        );
      }

      request.user = usuario;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}
