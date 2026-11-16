import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoImplemento, Prisma } from '@prisma/client';
import { normalizeSearchTerm } from '../common/utils/search';
import {
  extractSerialConsecutive,
  formatSerial,
  isValidSerialPrefix,
} from '../common/utils/serial';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemBatchDto } from './dto/create-item-batch.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';

const itemInclude = {
  categoria: true,
} satisfies Prisma.ImplementoInclude;

type ItemWithCategory = Prisma.ImplementoGetPayload<{ include: typeof itemInclude }>;

const MAX_SERIAL_ATTEMPTS = 10_000;

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListItemsQueryDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 50);
    const term = normalizeSearchTerm(query.search);

    const where: Prisma.ImplementoWhereInput = {
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.categoriaId ? { categoriaId: query.categoriaId } : {}),
      ...(term
        ? {
            OR: [
              { nombre: { contains: term, mode: 'insensitive' } },
              { codigoSerie: { contains: term, mode: 'insensitive' } },
              { descripcion: { contains: term, mode: 'insensitive' } },
              {
                categoria: {
                  nombre: { contains: term, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.implemento.findMany({
        where,
        include: itemInclude,
        orderBy: [{ nombre: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.implemento.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findAvailable() {
    const data = await this.prisma.implemento.findMany({
      where: { estado: EstadoImplemento.DISPONIBLE },
      include: itemInclude,
      orderBy: [{ nombre: 'asc' }],
    });

    return { data, total: data.length };
  }

  async findOne(id: number) {
    const implemento = await this.prisma.implemento.findUnique({
      where: { id },
      include: itemInclude,
    });

    if (!implemento) {
      throw new NotFoundException('Implemento no encontrado.');
    }

    return implemento;
  }

  async create(dto: CreateItemDto) {
    const { items } = await this.createBatch({ ...dto, cantidad: 1 });
    return items[0];
  }

  async createBatch(dto: CreateItemBatchDto) {
    this.assertManualState(dto.estado);

    return this.prisma.$transaction(
      async (tx) => {
        const categoria = await tx.categoria.findUnique({
          where: { id: dto.categoriaId },
          select: { id: true, prefijo: true },
        });

        if (!categoria) {
          throw new BadRequestException('La categoría seleccionada no existe.');
        }

        if (!isValidSerialPrefix(categoria.prefijo)) {
          throw new BadRequestException(
            'La categoría no tiene un prefijo de serial válido. Actualice la categoría antes de crear implementos.',
          );
        }

        const items: ItemWithCategory[] = [];

        for (let index = 0; index < dto.cantidad; index += 1) {
          const codigoSerie = await this.reserveSerial(
            tx,
            categoria.id,
            categoria.prefijo,
          );

          const item = await tx.implemento.create({
            data: {
              codigoSerie,
              nombre: dto.nombre.trim(),
              categoriaId: categoria.id,
              descripcion: dto.descripcion?.trim() || null,
              precioAlquilerDiario: dto.precioAlquilerDiario,
              estado: dto.estado ?? EstadoImplemento.DISPONIBLE,
            },
            include: itemInclude,
          });

          items.push(item);
        }

        return { items, total: items.length };
      },
      { timeout: 30000 },
    );
  }

  async update(id: number, dto: UpdateItemDto) {
    const implemento = await this.findOne(id);

    this.assertManualState(dto.estado);

    if (
      implemento.estado === EstadoImplemento.ALQUILADO &&
      dto.estado !== undefined &&
      dto.estado !== EstadoImplemento.ALQUILADO
    ) {
      throw new BadRequestException(
        'No se puede cambiar el estado de un implemento que está alquilado.',
      );
    }

    const data: Prisma.ImplementoUpdateInput = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined) {
      data.descripcion = dto.descripcion.trim() || null;
    }
    if (dto.precioAlquilerDiario !== undefined) {
      data.precioAlquilerDiario = dto.precioAlquilerDiario;
    }
    if (dto.estado !== undefined) data.estado = dto.estado;

    if (dto.categoriaId === undefined || dto.categoriaId === implemento.categoriaId) {
      return this.prisma.implemento.update({
        where: { id },
        data,
        include: itemInclude,
      });
    }

    const targetCategoryId = dto.categoriaId;

    return this.prisma.$transaction(
      async (tx) => {
        const target = await tx.categoria.findUnique({
          where: { id: targetCategoryId },
          select: {
            id: true,
            prefijo: true,
            ultimoConsecutivo: true,
          },
        });

        if (!target) {
          throw new BadRequestException('La categoría seleccionada no existe.');
        }

        // Si el implemento conserva un serial que ya pertenece al prefijo de
        // la categoría destino, el consecutivo no puede quedar por debajo.
        const serialConsecutive = extractSerialConsecutive(
          implemento.codigoSerie,
          target.prefijo,
        );

        if (serialConsecutive !== null && serialConsecutive > target.ultimoConsecutivo) {
          await tx.categoria.updateMany({
            where: {
              id: target.id,
              ultimoConsecutivo: { lt: serialConsecutive },
            },
            data: { ultimoConsecutivo: serialConsecutive },
          });
        }

        data.categoria = { connect: { id: target.id } };

        return tx.implemento.update({
          where: { id },
          data,
          include: itemInclude,
        });
      },
      { timeout: 15000 },
    );
  }

  async remove(id: number) {
    const implemento = await this.findOne(id);

    if (implemento.estado === EstadoImplemento.ALQUILADO) {
      throw new ConflictException(
        'No se puede eliminar un implemento que está alquilado.',
      );
    }

    const detailsCount = await this.prisma.detalleAlquiler.count({
      where: { implementoId: id },
    });

    if (detailsCount > 0) {
      throw new ConflictException(
        'No se puede eliminar el implemento porque tiene historial de alquileres.',
      );
    }

    await this.prisma.implemento.delete({ where: { id } });
    return { message: 'Implemento eliminado correctamente.' };
  }

  private async reserveSerial(
    tx: Prisma.TransactionClient,
    categoriaId: number,
    prefijo: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < MAX_SERIAL_ATTEMPTS; attempt += 1) {
      const categoria = await tx.categoria.update({
        where: { id: categoriaId },
        data: { ultimoConsecutivo: { increment: 1 } },
        select: { ultimoConsecutivo: true },
      });

      const codigoSerie = formatSerial(prefijo, categoria.ultimoConsecutivo);
      const existing = await tx.implemento.findUnique({
        where: { codigoSerie },
        select: { id: true },
      });

      if (!existing) {
        return codigoSerie;
      }
    }

    throw new ConflictException(
      'No fue posible generar un serial único para la categoría. Verifique los consecutivos existentes.',
    );
  }

  private assertManualState(estado?: EstadoImplemento): void {
    if (estado === EstadoImplemento.ALQUILADO) {
      throw new BadRequestException(
        'El estado ALQUILADO solo puede asignarse automáticamente al registrar un alquiler.',
      );
    }
  }
}
