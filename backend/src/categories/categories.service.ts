import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  create(dto: CreateCategoryDto) {
    return this.prisma.categoria.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
      },
      include: { _count: { select: { implementos: true } } },
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);

    const data: Prisma.CategoriaUpdateInput = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined) {
      data.descripcion = dto.descripcion.trim() || null;
    }

    return this.prisma.categoria.update({
      where: { id },
      data,
      include: { _count: { select: { implementos: true } } },
    });
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
}
