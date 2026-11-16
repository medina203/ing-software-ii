import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeSerialPrefix } from '../common/utils/serial';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const data = await this.prisma.categoria.findMany({
      include: { _count: { select: { implementos: true } } },
      orderBy: { nombre: 'asc' },
    });

    return { data, total: data.length };
  }

  async findOne(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: { _count: { select: { implementos: true } } },
    });

    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    return categoria;
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.categoria.create({
        data: {
          nombre: dto.nombre.trim(),
          prefijo: normalizeSerialPrefix(dto.prefijo),
          descripcion: dto.descripcion?.trim() || null,
        },
        include: { _count: { select: { implementos: true } } },
      });
    } catch (error) {
      this.throwIfUniqueConstraint(error);
    }
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const categoria = await this.findOne(id);

    const data: Prisma.CategoriaUpdateInput = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined) {
      data.descripcion = dto.descripcion.trim() || null;
    }
    if (dto.prefijo !== undefined) {
      const prefijo = normalizeSerialPrefix(dto.prefijo);

      if (prefijo !== categoria.prefijo) {
        if (categoria._count.implementos > 0) {
          throw new ConflictException(
            'No se puede cambiar el prefijo de una categoría que ya tiene implementos. Los seriales existentes se conservan.',
          );
        }
        data.prefijo = prefijo;
        data.ultimoConsecutivo = 0;
      }
    }

    try {
      return await this.prisma.categoria.update({
        where: { id },
        data,
        include: { _count: { select: { implementos: true } } },
      });
    } catch (error) {
      this.throwIfUniqueConstraint(error);
    }
  }

  async remove(id: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: { _count: { select: { implementos: true } } },
    });

    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    if (categoria._count.implementos > 0) {
      throw new ConflictException(
        'No se puede eliminar la categoría porque tiene implementos asociados.',
      );
    }

    await this.prisma.categoria.delete({ where: { id } });
    return { message: 'Categoría eliminada correctamente.' };
  }

  private throwIfUniqueConstraint(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : String(error.meta?.target ?? '');

      if (target.includes('prefijo')) {
        throw new ConflictException('Ya existe una categoría con ese prefijo.');
      }
      if (target.includes('nombre')) {
        throw new ConflictException('Ya existe una categoría con ese nombre.');
      }
      throw new ConflictException('Ya existe una categoría con los mismos datos.');
    }

    throw error;
  }
}
