import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoAlquiler, EstadoEntrega, EstadoImplemento, Prisma } from '@prisma/client';
import { markOverdueRentals } from '../common/utils/rental-status';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns-query.dto';

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

const returnInclude = {
  usuario: { select: userSummary },
  alquiler: {
    include: {
      cliente: { select: clientSummary },
      usuario: { select: userSummary },
      detalles: {
        include: { implemento: { select: itemSummary } },
        orderBy: { id: 'asc' },
      },
    },
  },
  detalles: {
    include: { implemento: { select: itemSummary } },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.DevolucionInclude;

const pendingRentalInclude = {
  cliente: { select: clientSummary },
  usuario: { select: userSummary },
  detalles: {
    include: { implemento: { select: itemSummary } },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.AlquilerInclude;

const finalStateMap: Record<
  'DISPONIBLE' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO',
  EstadoEntrega
> = {
  DISPONIBLE: EstadoEntrega.DISPONIBLE,
  MANTENIMIENTO: EstadoEntrega.MANTENIMIENTO,
  FUERA_DE_SERVICIO: EstadoEntrega.FUERA_DE_SERVICIO,
};

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPending() {
    await markOverdueRentals(this.prisma);

    const data = await this.prisma.alquiler.findMany({
      where: {
        estado: {
          in: [EstadoAlquiler.ACTIVO, EstadoAlquiler.VENCIDO],
        },
        devolucion: null,
      },
      include: pendingRentalInclude,
      orderBy: [{ fechaPactadaDevolucion: 'asc' }, { id: 'asc' }],
    });

    return { data, total: data.length };
  }

  async findAll(query: ListReturnsQueryDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const term = query.search?.trim();

    const where: Prisma.DevolucionWhereInput = term
      ? {
          OR: [
            {
              alquiler: {
                codigoAlquiler: { contains: term, mode: 'insensitive' },
              },
            },
            {
              alquiler: {
                cliente: {
                  documentoIdentidad: {
                    contains: term,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              alquiler: {
                cliente: {
                  nombres: { contains: term, mode: 'insensitive' },
                },
              },
            },
            {
              alquiler: {
                cliente: {
                  apellidos: { contains: term, mode: 'insensitive' },
                },
              },
            },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.devolucion.findMany({
        where,
        include: returnInclude,
        orderBy: { fechaDevolucion: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.devolucion.count({ where }),
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
    const devolucion = await this.prisma.devolucion.findUnique({
      where: { id },
      include: returnInclude,
    });

    if (!devolucion) {
      throw new NotFoundException('Devolución no encontrada.');
    }

    return devolucion;
  }

  async create(dto: CreateReturnDto, usuarioId: number) {
    const implementoIds = dto.implementos.map((item) => item.implementoId);
    if (new Set(implementoIds).size !== implementoIds.length) {
      throw new BadRequestException(
        'Un implemento no puede repetirse en la misma devolución.',
      );
    }

    if (dto.implementos.some((item) => item.estadoFinal === EstadoImplemento.ALQUILADO)) {
      throw new BadRequestException(
        'El estado final de un implemento no puede ser ALQUILADO.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const alquiler = await tx.alquiler.findUnique({
          where: { id: dto.alquilerId },
          include: {
            devolucion: { select: { id: true } },
            detalles: {
              include: {
                implemento: {
                  select: { id: true, codigoSerie: true, nombre: true },
                },
              },
            },
          },
        });

        if (!alquiler) {
          throw new NotFoundException('Alquiler no encontrado.');
        }

        if (alquiler.estado === EstadoAlquiler.FINALIZADO || alquiler.devolucion) {
          throw new ConflictException(
            'Este alquiler ya tiene una devolución registrada.',
          );
        }

        const rentalItemIds = new Set(
          alquiler.detalles.map((detalle) => detalle.implementoId),
        );
        const requestedItemIds = new Set(implementoIds);

        const sameItems =
          rentalItemIds.size === requestedItemIds.size &&
          [...rentalItemIds].every((id) => requestedItemIds.has(id));

        if (!sameItems) {
          throw new BadRequestException(
            'La devolución debe incluir exactamente todos los implementos del alquiler.',
          );
        }

        const hasIssues = dto.implementos.some(
          (item) => item.estadoFinal !== EstadoImplemento.DISPONIBLE,
        );

        const devolucion = await tx.devolucion.create({
          data: {
            alquilerId: dto.alquilerId,
            usuarioId,
            estadoEntregaImplementos: hasIssues ? 'Con novedades' : 'Sin novedades',
            observaciones: dto.observaciones?.trim() || null,
            detalles: {
              create: dto.implementos.map((item) => ({
                implementoId: item.implementoId,
                estadoFinal:
                  finalStateMap[item.estadoFinal as keyof typeof finalStateMap],
                observaciones: item.observaciones?.trim() || null,
              })),
            },
          },
        });

        for (const item of dto.implementos) {
          await tx.implemento.update({
            where: { id: item.implementoId },
            data: { estado: item.estadoFinal },
          });
        }

        await tx.alquiler.update({
          where: { id: dto.alquilerId },
          data: { estado: EstadoAlquiler.FINALIZADO },
        });

        return tx.devolucion.findUniqueOrThrow({
          where: { id: devolucion.id },
          include: returnInclude,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  }
}
