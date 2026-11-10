import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const publicUserSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  createdAt: true,
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const data = await this.prisma.usuario.findMany({
      select: publicUserSelect,
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });

    return { data, total: data.length };
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return usuario;
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.usuario.create({
      data: {
        nombre: dto.nombre.trim(),
        email: dto.email.trim().toLowerCase(),
        passwordHash,
        rol: dto.rol ?? Rol.EMPLEADO,
        activo: dto.activo ?? true,
      },
      select: publicUserSelect,
    });
  }

  async update(id: number, dto: UpdateUserDto, requestingUserId: number) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (id === requestingUserId && dto.activo === false) {
      throw new BadRequestException(
        'No puede desactivar su propia cuenta de usuario.',
      );
    }

    const losesAdminAccess =
      usuario.rol === Rol.ADMIN &&
      ((dto.rol !== undefined && dto.rol !== Rol.ADMIN) ||
        dto.activo === false);

    if (losesAdminAccess) {
      const activeAdmins = await this.prisma.usuario.count({
        where: { rol: Rol.ADMIN, activo: true },
      });
      if (activeAdmins <= 1) {
        throw new BadRequestException(
          'Debe existir al menos un administrador activo en el sistema.',
        );
      }
    }

    const data: Prisma.UsuarioUpdateInput = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.rol !== undefined) data.rol = dto.rol;
    if (dto.activo !== undefined) data.activo = dto.activo;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
  }
}
