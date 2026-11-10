import { Injectable } from '@nestjs/common';
import { EstadoAlquiler, EstadoImplemento, Prisma } from '@prisma/client';
import { addDays, startOfTodayUtc } from '../common/utils/dates';
import { markOverdueRentals } from '../common/utils/rental-status';
import { PrismaService } from '../prisma/prisma.service';
import { RevenueDailyQueryDto } from './dto/revenue-daily-query.dto';
import { RevenueMonthlyQueryDto } from './dto/revenue-monthly-query.dto';
import { TopItemsQueryDto } from './dto/top-items-query.dto';

const userSummary = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
} satisfies Prisma.UsuarioSelect;

const clientSummary = {
  id: true,
  documentoIdentidad: true,
  nombres: true,
  apellidos: true,
  telefono: true,
  correo: true,
} satisfies Prisma.ClienteSelect;

const itemSummary = {
  id: true,
  codigoSerie: true,
  nombre: true,
  estado: true,
  precioAlquilerDiario: true,
  categoria: { select: { id: true, nombre: true } },
} satisfies Prisma.ImplementoSelect;

const activeRentalInclude = {
  cliente: { select: clientSummary },
  usuario: { select: userSummary },
  detalles: {
    include: { implemento: { select: itemSummary } },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.AlquilerInclude;

const ALL_STATES = [
  EstadoImplemento.DISPONIBLE,
  EstadoImplemento.ALQUILADO,
  EstadoImplemento.MANTENIMIENTO,
  EstadoImplemento.FUERA_DE_SERVICIO,
] as const;

const revenueRentalSelect = {
  id: true,
  fechaAlquiler: true,
  fechaPactadaDevolucion: true,
  estado: true,
  devolucion: { select: { fechaDevolucion: true } },
  detalles: { select: { precioUnitario: true } },
} satisfies Prisma.AlquilerSelect;

type RevenueRental = Prisma.AlquilerGetPayload<{
  select: typeof revenueRentalSelect;
}>;

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

function utcDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventorySummary() {
    const grouped = await this.prisma.implemento.groupBy({
      by: ['estado'],
      _count: { _all: true },
    });

    const total = grouped.reduce(
      (sum, item) => sum + item._count._all,
      0,
    );

    return {
      total,
      porEstado: ALL_STATES.map((estado) => {
        const cantidad =
          grouped.find((item) => item.estado === estado)?._count._all ?? 0;
        return {
          estado,
          cantidad,
          porcentaje:
            total > 0 ? Number(((cantidad / total) * 100).toFixed(1)) : 0,
        };
      }),
    };
  }

  async getTopItems(query: TopItemsQueryDto) {
    const limit = Number(query.limit ?? 10);
    const grouped = await this.prisma.detalleAlquiler.groupBy({
      by: ['implementoId'],
      _count: { implementoId: true },
      orderBy: [
        { _count: { implementoId: 'desc' } },
        { implementoId: 'asc' },
      ],
      take: limit,
    });

    if (grouped.length === 0) {
      return [];
    }

    const implementos = await this.prisma.implemento.findMany({
      where: { id: { in: grouped.map((item) => item.implementoId) } },
      include: { categoria: true },
    });

    const byId = new Map(
      implementos.map((implemento) => [implemento.id, implemento]),
    );

    return grouped.map((item, index) => ({
      posicion: index + 1,
      totalAlquileres: item._count.implementoId,
      implemento: byId.get(item.implementoId) ?? null,
    }));
  }

  async getActiveRentals() {
    await markOverdueRentals(this.prisma);

    const data = await this.prisma.alquiler.findMany({
      where: {
        estado: {
          in: [EstadoAlquiler.ACTIVO, EstadoAlquiler.VENCIDO],
        },
      },
      include: activeRentalInclude,
      orderBy: [{ fechaPactadaDevolucion: 'asc' }, { id: 'asc' }],
    });

    return { data, total: data.length };
  }

  async getDailyRevenue(query: RevenueDailyQueryDto) {
    const days = Number(query.days ?? 14);
    const today = startOfTodayUtc();
    const endExclusive = addDays(today, 1);
    const start = addDays(endExclusive, -days);
    const buckets = await this.buildRevenueByDay();

    const data: Array<{
      fecha: string;
      total: number;
      alquileres: number;
    }> = [];
    let total = 0;

    for (
      let cursor = start;
      cursor < endExclusive;
      cursor = addDays(cursor, 1)
    ) {
      const key = dayKey(cursor);
      const bucket = buckets.get(key);
      const amount = roundMoney(bucket?.total ?? 0);
      total += amount;
      data.push({
        fecha: key,
        total: amount,
        alquileres: bucket?.rentalIds.size ?? 0,
      });
    }

    return {
      desde: dayKey(start),
      hasta: dayKey(today),
      dias: days,
      total: roundMoney(total),
      promedioDiario: roundMoney(days > 0 ? total / days : 0),
      data,
    };
  }

  async getMonthlyRevenue(query: RevenueMonthlyQueryDto) {
    const year = Number(query.year ?? new Date().getUTCFullYear());
    const buckets = await this.buildRevenueByDay();
    const months = MONTH_NAMES.map((nombre, index) => ({
      mes: index + 1,
      nombre,
      total: 0,
      rentalIds: new Set<number>(),
    }));

    for (const [key, bucket] of buckets) {
      if (!key.startsWith(`${year}-`)) continue;

      const month = Number(key.slice(5, 7));
      const target = months[month - 1];
      if (!target) continue;

      target.total += bucket.total;
      for (const rentalId of bucket.rentalIds) {
        target.rentalIds.add(rentalId);
      }
    }

    const meses = months.map(({ mes, nombre, total, rentalIds }) => ({
      mes,
      nombre,
      total: roundMoney(total),
      alquileres: rentalIds.size,
    }));

    return {
      year,
      total: roundMoney(meses.reduce((sum, month) => sum + month.total, 0)),
      meses,
    };
  }

  private async buildRevenueByDay() {
    // Ingreso devengado = tarifa diaria del alquiler por cada día del período.
    // Los alquileres finalizados usan la fecha real de devolución; los que
    // siguen en curso o vencidos se acumulan hasta el día actual.
    const rentals: RevenueRental[] = await this.prisma.alquiler.findMany({
      select: revenueRentalSelect,
    });
    const today = startOfTodayUtc();
    const buckets = new Map<
      string,
      { total: number; rentalIds: Set<number> }
    >();

    for (const rental of rentals) {
      const dailyRate = rental.detalles.reduce(
        (sum, detalle) => sum + Number(detalle.precioUnitario),
        0,
      );
      if (dailyRate <= 0) continue;

      const start = utcDay(rental.fechaAlquiler);
      if (start > today) continue;

      const end = utcDay(
        rental.devolucion?.fechaDevolucion ??
          (rental.estado === EstadoAlquiler.FINALIZADO
            ? rental.fechaPactadaDevolucion
            : today),
      );
      const endExclusive = end < start ? addDays(start, 1) : addDays(end, 1);

      for (
        let cursor = start;
        cursor < endExclusive;
        cursor = addDays(cursor, 1)
      ) {
        const key = dayKey(cursor);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.total += dailyRate;
          bucket.rentalIds.add(rental.id);
        } else {
          buckets.set(key, {
            total: dailyRate,
            rentalIds: new Set([rental.id]),
          });
        }
      }
    }

    return buckets;
  }

  async getDashboard() {
    await markOverdueRentals(this.prisma);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [
      inventorySummary,
      activeRentals,
      clientesRegistrados,
      devolucionesEsteMes,
      alquileresVencidos,
      topImplementos,
      alquileresEnCurso,
    ] = await Promise.all([
      this.getInventorySummary(),
      this.prisma.alquiler.findMany({
        where: {
          estado: {
            in: [EstadoAlquiler.ACTIVO, EstadoAlquiler.VENCIDO],
          },
        },
        include: activeRentalInclude,
        orderBy: [{ fechaPactadaDevolucion: 'asc' }, { id: 'asc' }],
        take: 6,
      }),
      this.prisma.cliente.count(),
      this.prisma.devolucion.count({
        where: { fechaDevolucion: { gte: monthStart } },
      }),
      this.prisma.alquiler.count({
        where: { estado: EstadoAlquiler.VENCIDO },
      }),
      this.getTopItems({ limit: 5 }),
      this.prisma.alquiler.count({
        where: {
          estado: {
            in: [EstadoAlquiler.ACTIVO, EstadoAlquiler.VENCIDO],
          },
        },
      }),
    ]);

    const stateCount = (estado: EstadoImplemento) =>
      inventorySummary.porEstado.find((item) => item.estado === estado)
        ?.cantidad ?? 0;

    return {
      generadoEn: new Date().toISOString(),
      fechaCorte: startOfTodayUtc().toISOString(),
      resumen: {
        totalImplementos: inventorySummary.total,
        disponibles: stateCount(EstadoImplemento.DISPONIBLE),
        alquilados: stateCount(EstadoImplemento.ALQUILADO),
        mantenimiento: stateCount(EstadoImplemento.MANTENIMIENTO),
        fueraDeServicio: stateCount(
          EstadoImplemento.FUERA_DE_SERVICIO,
        ),
        alquileresEnCurso,
        alquileresVencidos,
        clientesRegistrados,
        devolucionesEsteMes,
      },
      porEstado: inventorySummary.porEstado,
      topImplementos,
      alquileresActivos: activeRentals,
    };
  }
}
