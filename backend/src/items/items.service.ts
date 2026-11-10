import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoImplemento, Prisma } from '@prisma/client';
import { normalizeSearchTerm } from '../common/utils/search';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';

const itemInclude = {
  categoria: true,
} satisfies Prisma.ImplementoInclude;

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
    await this.assertCategoryExists(dto.categoriaId);
    this.assertManualState(dto.estado);

    return this.prisma.implemento.create({
      data: {
        codigoSerie: dto.codigoSerie.trim().toUpperCase(),
        nombre: dto.nombre.trim(),
        categoriaId: dto.categoriaId,
        descripcion: dto.descripcion?.trim() || null,
        precioAlquilerDiario: dto.precioAlquilerDiario,
        estado: dto.estado ?? EstadoImplemento.DISPONIBLE,
      },
      include: itemInclude,
    });
  }

  async update(id: number, dto: UpdateItemDto) {
    const implemento = await this.findOne(id);

    if (dto.categoriaId !== undefined) {
      await this.assertCategoryExists(dto.categoriaId);
    }

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
    if (dto.codigoSerie !== undefined) {
      data.codigoSerie = dto.codigoSerie.trim().toUpperCase();
    }
    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.categoriaId !== undefined) {
      data.categoria = { connect: { id: dto.categoriaId } };
    }
    if (dto.descripcion !== undefined) {
      data.descripcion = dto.descripcion.trim() || null;
    }
    if (dto.precioAlquilerDiario !== undefined) {
      data.precioAlquilerDiario = dto.precioAlquilerDiario;
    }
    if (dto.estado !== undefined) data.estado = dto.estado;

    return this.prisma.implemento.update({
      where: { id },
      data,
      include: itemInclude,
    });
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

  private async assertCategoryExists(categoriaId: number): Promise<void> {
    const exists = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
      select: { id: true },
    });

    if (!exists) {
      throw new BadRequestException('La categoría seleccionada no existe.');
    }
  }

  private assertManualState(estado?: EstadoImplemento): void {
    if (estado === EstadoImplemento.ALQUILADO) {
      throw new BadRequestException(
        'El estado ALQUILADO solo puede asignarse automáticamente al registrar un alquiler.',
      );
    }
  }
}
