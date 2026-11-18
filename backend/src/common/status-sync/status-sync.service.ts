import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { accrueOverdueInvoices, markOverdueInvoices } from '../utils/billing';
import { markOverdueRentals } from '../utils/rental-status';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_INTERVAL_MINUTES = 15;

/**
 * Sincroniza en segundo plano los estados que dependen de la fecha
 * (alquileres VENCIDOS y facturas VENCIDAS). Reemplaza las escrituras que se
 * hacían dentro de peticiones GET (hallazgo H-06): las lecturas calculan el
 * estado efectivo y este proceso mantiene la base de datos al día para
 * reportes y consultas agregadas.
 */
@Injectable()
export class StatusSyncService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(StatusSyncService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    const minutes = Number(
      process.env.STATUS_SYNC_INTERVAL_MINUTES ?? DEFAULT_INTERVAL_MINUTES,
    );
    void this.sync();

    if (Number.isFinite(minutes) && minutes > 0) {
      this.timer = setInterval(() => void this.sync(), minutes * 60_000);
      this.timer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async sync(): Promise<{ alquileres: number; facturas: number }> {
    if (this.running) return { alquileres: 0, facturas: 0 };
    this.running = true;
    try {
      const alquileres = await markOverdueRentals(this.prisma);
      // Primero suma el retraso de los alquileres vencidos sin devolución.
      const acumuladas = await accrueOverdueInvoices(this.prisma);
      const facturas = (await markOverdueInvoices(this.prisma)) + acumuladas;
      if (alquileres + facturas > 0) {
        this.logger.log(
          `Estados sincronizados: ${alquileres} alquiler(es) y ${facturas} factura(s) vencidos.`,
        );
      }
      return { alquileres, facturas };
    } catch (error) {
      this.logger.error(
        'No se pudieron sincronizar los estados vencidos.',
        error as Error,
      );
      return { alquileres: 0, facturas: 0 };
    } finally {
      this.running = false;
    }
  }
}
