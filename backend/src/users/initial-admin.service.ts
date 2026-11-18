import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readInitialAdmin } from '../common/config/production';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Crea el primer administrador en una base de datos vacía (por ejemplo, el primer
 * despliegue en producción) a partir de ADMIN_EMAIL y ADMIN_PASSWORD.
 * Si ya existe algún usuario no hace nada, así que nunca cambia contraseñas.
 */
@Injectable()
export class InitialAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitialAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureInitialAdmin();
  }

  /** Devuelve true si creó el administrador. */
  async ensureInitialAdmin(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
    const config = readInitialAdmin(env);
    if (!config) return false;

    const users = await this.prisma.usuario.count();
    if (users > 0) return false;

    await this.prisma.usuario.create({
      data: {
        nombre: config.nombre,
        email: config.email,
        passwordHash: await bcrypt.hash(config.password, 10),
        rol: Rol.ADMIN,
      },
    });
    this.logger.log(`Administrador inicial creado: ${config.email}`);
    return true;
  }
}
