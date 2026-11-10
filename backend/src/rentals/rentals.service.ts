import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoAlquiler, EstadoImplemento, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  parseDateOnly,
  startOfTodayUtc,
  yyyymmdd,
} from '../common/utils/dates';
import { markOverdueRentals } from '../common/utils/rental-status';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { ListRentalsQueryDto } from './dto/list-rentals-query.dto';

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
  direccion: true,
} satisfies Prisma.ClienteSelect;

const itemSummary = {
  id: true,
  codigoSerie: true,
  nombre: true,
  estado: true,
  precioAlquilerDiario: true,
  categoria: { select: { id: true, nombre: true } },
} satisfies Prisma.ImplementoSelect;

const rentalInclude = {
  cliente: { select: clientSummary },
  usuario: { select: userSummary },
  detalles: {
    include: {
      implemento: { select: itemSummary },
    },
    orderBy: { id: 'asc' },
  },
  devolucion: {
    include: {
      usuario: { select: userSummary },
      detalles: {
        include: {
          implemento: { select: itemSummary },
        },
        orderBy: { id: 'asc' },
      },
    },
  },
} satisfies Prisma.AlquilerInclude;

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListRentalsQueryDto) {
    await markOverdueRentals(this.prisma);

    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const term = query.search?.trim();

    const where: Prisma.AlquilerWhereInput = {
      ...(query.estado ? { estado: query.estado } : {}),
      ...(term
        ? {
            OR: [
              {
                codigoAlquiler: { contains: term, mode: 'insensitive' },
              },
              {
                cliente: {
                  documentoIdentidad: {
                    contains: term,
                    mode: 'insensitive',
                  },
                },
              },
              {
                cliente: {
                  nombres: { contains: term, mode: 'insensitive' },
                },
              },
              {
                cliente: {
                  apellidos: { contains: term, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.alquiler.findMany({
        where,
        include: rentalInclude,
        orderBy: [{ fechaAlquiler: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.alquiler.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    await markOverdueRentals(this.prisma);

    const alquiler = await this.prisma.alquiler.findUnique({
      where: { id },
      include: rentalInclude,
    });

    if (!alquiler) {
      throw new NotFoundException('Alquiler no encontrado.');
    }

    return alquiler;
  }

  async create(dto: CreateRentalDto, usuarioId: number) {
    const fechaPactada = parseDateOnly(dto.fechaPactadaDevolucion);
    if (fechaPactada < startOfTodayUtc()) {
      throw new BadRequestException(
        'La fecha pactada de devolución no puede ser anterior a hoy.',
      );
    }

    const implementoIds = dto.implementos.map((item) => item.implementoId);
    if (new Set(implementoIds).size !== implementoIds.length) {
      throw new BadRequestException(
        'Un implemento no puede repetirse en el mismo alquiler.',
      );
    }

    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
      select: { id: true },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const implementos = await tx.implemento.findMany({
          where: { id: { in: implementoIds } },
          select: {
            id: true,
            codigoSerie: true,
            nombre: true,
            estado: true,
            precioAlquilerDiario: true,
          },
        });

        if (implementos.length !== implementoIds.length) {
          throw new BadRequestException(
            'Uno o más implementos seleccionados no existen.',
          );
        }

        const noDisponibles = implementos.filter(
          (implemento) =>
            implemento.estado !== EstadoImplemento.DISPONIBLE,
        );

        if (noDisponibles.length > 0) {
          const detalle = noDisponibles
            .map((item) => `${item.codigoSerie} (${item.nombre})`)
            .join(', ');
          throw new ConflictException(
            `Solo se pueden alquilar implementos disponibles. No disponible(s): ${detalle}.`,
          );
        }

        const implementosPorId = new Map(
          implementos.map((implemento) => [implemento.id, implemento]),
        );

        const alquilerTemporal = await tx.alquiler.create({
          data: {
            codigoAlquiler: `TMP-${randomUUID()}`,
            clienteId: dto.clienteId,
            usuarioId,
            fechaPactadaDevolucion: fechaPactada,
            estado: EstadoAlquiler.ACTIVO,
            observaciones: dto.observaciones?.trim() || null,
            detalles: {
              create: implementoIds.map((implementoId) => ({
                implementoId,
                precioUnitario:
                  implementosPorId.get(implementoId)!.precioAlquilerDiario,
              })),
            },
          },
        });

        const codigoAlquiler = `ALQ-${yyyymmdd(
          new Date(),
        )}-${String(alquilerTemporal.id).padStart(5, '0')}`;

        await tx.alquiler.update({
          where: { id: alquilerTemporal.id },
          data: { codigoAlquiler },
        });

        const updated = await tx.implemento.updateMany({
          where: {
            id: { in: implementoIds },
            estado: EstadoImplemento.DISPONIBLE,
          },
          data: { estado: EstadoImplemento.ALQUILADO },
        });

        if (updated.count !== implementoIds.length) {
          throw new ConflictException(
            'La disponibilidad del inventario cambió mientras se registraba el alquiler. Actualice la lista e intente nuevamente.',
          );
        }

        return tx.alquiler.findUniqueOrThrow({
          where: { id: alquilerTemporal.id },
          include: rentalInclude,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  }
}
