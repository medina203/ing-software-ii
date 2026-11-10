import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const term = search?.trim();
    const where: Prisma.ClienteWhereInput = term
      ? {
          OR: [
            { documentoIdentidad: { contains: term, mode: 'insensitive' } },
            { nombres: { contains: term, mode: 'insensitive' } },
            { apellidos: { contains: term, mode: 'insensitive' } },
            { telefono: { contains: term, mode: 'insensitive' } },
            { correo: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};

    const data = await this.prisma.cliente.findMany({
      where,
      include: {
        _count: { select: { alquileres: true } },
      },
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
    });

    return { data, total: data.length };
  }

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        _count: { select: { alquileres: true } },
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    return cliente;
  }

  async create(dto: CreateClientDto) {
    return this.prisma.cliente.create({
      data: {
        documentoIdentidad: dto.documentoIdentidad.trim(),
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        telefono: dto.telefono.trim(),
        correo: dto.correo?.trim().toLowerCase() || null,
        direccion: dto.direccion?.trim() || null,
      },
      include: {
        _count: { select: { alquileres: true } },
      },
    });
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findOne(id);

    const data: Prisma.ClienteUpdateInput = {};
    if (dto.documentoIdentidad !== undefined) {
      data.documentoIdentidad = dto.documentoIdentidad.trim();
    }
    if (dto.nombres !== undefined) data.nombres = dto.nombres.trim();
    if (dto.apellidos !== undefined) data.apellidos = dto.apellidos.trim();
    if (dto.telefono !== undefined) data.telefono = dto.telefono.trim();
    if (dto.correo !== undefined) {
      data.correo = dto.correo.trim().toLowerCase() || null;
    }
    if (dto.direccion !== undefined) {
      data.direccion = dto.direccion.trim() || null;
    }

    return this.prisma.cliente.update({
      where: { id },
      data,
      include: {
        _count: { select: { alquileres: true } },
      },
    });
  }

  async remove(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: { _count: { select: { alquileres: true } } },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    if (cliente._count.alquileres > 0) {
      throw new ConflictException(
        'No se puede eliminar el cliente porque tiene alquileres asociados.',
      );
    }

    await this.prisma.cliente.delete({ where: { id } });
    return { message: 'Cliente eliminado correctamente.' };
  }
}
