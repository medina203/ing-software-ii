import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Health check real (H-07): verifica la conexión con PostgreSQL y responde
   * 503 si la base de datos no está disponible.
   */
  @Public()
  @Get('health')
  async health() {
    const timestamp = new Date().toISOString();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'inventario-alquiler-api',
        database: 'down',
        timestamp,
        message: 'La base de datos no está disponible.',
      });
    }

    return {
      status: 'ok',
      service: 'inventario-alquiler-api',
      database: 'up',
      timestamp,
    };
  }
}
