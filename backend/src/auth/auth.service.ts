import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, usuario.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
        createdAt: usuario.createdAt,
      },
    };
  }

  getProfile(user: AuthenticatedUser) {
    return user;
  }

  async validateAdminCredentials(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const administrador = await this.prisma.usuario.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        passwordHash: true,
      },
    });

    if (!administrador || !administrador.activo || administrador.rol !== Rol.ADMIN) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_ADMIN_CREDENTIALS',
        message: 'Las credenciales del administrador no son válidas.',
      });
    }

    const passwordMatches = await bcrypt.compare(password, administrador.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_ADMIN_CREDENTIALS',
        message: 'Las credenciales del administrador no son válidas.',
      });
    }

    return {
      id: administrador.id,
      nombre: administrador.nombre,
      email: administrador.email,
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) {
      throw new UnauthorizedException('El usuario no existe.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.currentPassword,
      usuario.passwordHash,
    );

    if (!passwordMatches) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, usuario.passwordHash);

    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Contraseña actualizada correctamente.' };
  }
}
