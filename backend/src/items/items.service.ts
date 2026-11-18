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
import { UploadsService } from '../uploads/uploads.service';
import { CreateItemBatchDto } from './dto/create-item-batch.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemGroupKeyDto, UpdateItemGroupDto } from './dto/item-group.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';

const itemInclude = {
  categoria: true,
} satisfies Prisma.ImplementoInclude;

type ItemWithCategory = Prisma.ImplementoGetPayload<{ include: typeof itemInclude }>;

const MAX_SERIAL_ATTEMPTS = 10_000;

export interface ItemGroupSummary {
  categoriaId: number;
  nombre: string;
  categoria: { id: number; nombre: string; prefijo: string };
  descripcion: string | null;
  imagenUrl: string | null;
  precioMin: string;
  precioMax: string;
  total: number;
  disponibles: number;
  alquilados: number;
  mantenimiento: number;
  fueraDeServicio: number;
}

type GroupKey = { categoriaId: number; nombre: string };

function groupKeyId(key: GroupKey): string {
  return `${key.categoriaId}\u0000${key.nombre}`;
}

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  private buildWhere(query: ListItemsQueryDto): Prisma.ImplementoWhereInput {
    const term = normalizeSearchTerm(query.search);
    const nombre = normalizeSearchTerm(query.nombre);

    return {
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.categoriaId ? { categoriaId: query.categoriaId } : {}),
      ...(nombre ? { nombre: { equals: nombre, mode: 'insensitive' } } : {}),
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
  }

  async findAll(query: ListItemsQueryDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 50);
    const where = this.buildWhere(query);

    const [data, total] = await Promise.all([
      this.prisma.implemento.findMany({
        where,
        include: itemInclude,
        orderBy: [{ nombre: 'asc' }, { codigoSerie: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.implemento.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Inventario agrupado por tipo (categoría + nombre): una entrada por tipo con
   * su stock por estado. Los filtros seleccionan los tipos que tienen al menos
   * una unidad que cumpla; los conteos siempre incluyen todas sus unidades.
   */
  async findGroups(query: ListItemsQueryDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 50);

    const matching = await this.prisma.implemento.groupBy({
      by: ['categoriaId', 'nombre'],
      where: this.buildWhere(query),
      orderBy: [{ nombre: 'asc' }, { categoriaId: 'asc' }],
    });

    const total = matching.length;
    const keys: GroupKey[] = matching
      .slice((page - 1) * pageSize, page * pageSize)
      .map(({ categoriaId, nombre }) => ({ categoriaId, nombre }));

    const [totalUnidades, data] = await Promise.all([
      this.prisma.implemento.count({
        where: this.buildWhere({ ...query, estado: undefined }),
      }),
      this.summarizeGroups(keys),
    ]);

    return {
      data,
      total,
      totalUnidades,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private async summarizeGroups(keys: GroupKey[]): Promise<ItemGroupSummary[]> {
    if (keys.length === 0) return [];
    const where: Prisma.ImplementoWhereInput = {
      OR: keys.map((key) => ({ categoriaId: key.categoriaId, nombre: key.nombre })),
    };

    const [byState, prices, samples, descriptions, images] = await Promise.all([
      this.prisma.implemento.groupBy({
        by: ['categoriaId', 'nombre', 'estado'],
        where,
        _count: { _all: true },
      }),
      this.prisma.implemento.groupBy({
        by: ['categoriaId', 'nombre'],
        where,
        _min: { precioAlquilerDiario: true },
        _max: { precioAlquilerDiario: true },
      }),
      this.prisma.implemento.findMany({
        where,
        distinct: ['categoriaId', 'nombre'],
        orderBy: [{ categoriaId: 'asc' }, { nombre: 'asc' }, { id: 'desc' }],
        select: {
          categoriaId: true,
          nombre: true,
          descripcion: true,
          categoria: { select: { id: true, nombre: true, prefijo: true } },
        },
      }),
      // Descripción más reciente que no esté vacía (una unidad agregada sin
      // descripción no debe borrar la del tipo en la tarjeta).
      this.prisma.implemento.findMany({
        where: {
          AND: [where, { descripcion: { not: null } }, { NOT: { descripcion: '' } }],
        },
        distinct: ['categoriaId', 'nombre'],
        orderBy: [{ categoriaId: 'asc' }, { nombre: 'asc' }, { id: 'desc' }],
        select: { categoriaId: true, nombre: true, descripcion: true },
      }),
      this.prisma.implemento.findMany({
        where: { AND: [where, { imagenUrl: { not: null } }] },
        distinct: ['categoriaId', 'nombre'],
        orderBy: [{ categoriaId: 'asc' }, { nombre: 'asc' }, { id: 'desc' }],
        select: { categoriaId: true, nombre: true, imagenUrl: true },
      }),
    ]);

    const counts = new Map<string, Record<EstadoImplemento, number>>();
    for (const row of byState) {
      const id = groupKeyId(row);
      const current = counts.get(id) ?? {
        DISPONIBLE: 0,
        ALQUILADO: 0,
        MANTENIMIENTO: 0,
        FUERA_DE_SERVICIO: 0,
      };
      current[row.estado] += row._count._all;
      counts.set(id, current);
    }
    const priceMap = new Map(prices.map((row) => [groupKeyId(row), row]));
    const sampleMap = new Map(samples.map((row) => [groupKeyId(row), row]));
    const imageMap = new Map(images.map((row) => [groupKeyId(row), row.imagenUrl]));
    const descriptionMap = new Map(
      descriptions.map((row) => [groupKeyId(row), row.descripcion]),
    );

    return keys.map((key) => {
      const id = groupKeyId(key);
      const c = counts.get(id) ?? {
        DISPONIBLE: 0,
        ALQUILADO: 0,
        MANTENIMIENTO: 0,
        FUERA_DE_SERVICIO: 0,
      };
      const price = priceMap.get(id);
      const sample = sampleMap.get(id);
      return {
        categoriaId: key.categoriaId,
        nombre: key.nombre,
        categoria: sample?.categoria ?? { id: key.categoriaId, nombre: '', prefijo: '' },
        descripcion: descriptionMap.get(id) ?? null,
        imagenUrl: imageMap.get(id) ?? null,
        precioMin: price?._min.precioAlquilerDiario?.toString() ?? '0',
        precioMax: price?._max.precioAlquilerDiario?.toString() ?? '0',
        total: c.DISPONIBLE + c.ALQUILADO + c.MANTENIMIENTO + c.FUERA_DE_SERVICIO,
        disponibles: c.DISPONIBLE,
        alquilados: c.ALQUILADO,
        mantenimiento: c.MANTENIMIENTO,
        fueraDeServicio: c.FUERA_DE_SERVICIO,
      };
    });
  }

  /** Aplica nombre, descripción o tarifa a todas las unidades de un tipo. */
  async updateGroup(dto: UpdateItemGroupDto): Promise<ItemGroupSummary> {
    const key = await this.resolveGroupKey(dto);
    const nuevoNombre = normalizeSearchTerm(dto.nuevoNombre);

    if (nuevoNombre && nuevoNombre.toLowerCase() !== key.nombre.toLowerCase()) {
      const clash = await this.prisma.implemento.findFirst({
        where: {
          categoriaId: key.categoriaId,
          nombre: { equals: nuevoNombre, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (clash) {
        throw new ConflictException(
          `Ya existe un implemento "${nuevoNombre}" en esta categoría. Use "Agregar unidades" en ese implemento.`,
        );
      }
    }

    const data: Prisma.ImplementoUpdateManyMutationInput = {};
    if (nuevoNombre) data.nombre = nuevoNombre;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion.trim() || null;
    if (dto.precioAlquilerDiario !== undefined) {
      data.precioAlquilerDiario = dto.precioAlquilerDiario;
    }

    await this.prisma.implemento.updateMany({
      where: { categoriaId: key.categoriaId, nombre: key.nombre },
      data,
    });

    const [summary] = await this.summarizeGroups([
      { categoriaId: key.categoriaId, nombre: nuevoNombre ?? key.nombre },
    ]);
    return summary;
  }

  /**
   * Elimina un tipo completo. Es todo o nada: si alguna unidad está alquilada
   * o tiene historial, no se elimina ninguna.
   */
  async removeGroup(dto: ItemGroupKeyDto) {
    const key = await this.resolveGroupKey(dto);
    const where = { categoriaId: key.categoriaId, nombre: key.nombre };

    return this.prisma.$transaction(async (tx) => {
      const [rented, withHistory, total] = await Promise.all([
        tx.implemento.count({ where: { ...where, estado: EstadoImplemento.ALQUILADO } }),
        tx.implemento.count({ where: { ...where, detalles: { some: {} } } }),
        tx.implemento.count({ where }),
      ]);

      if (rented > 0 || withHistory > 0) {
        throw new ConflictException(
          `No se puede eliminar "${key.nombre}": ${withHistory} de ${total} unidades tienen historial de alquileres${
            rented > 0 ? ` y ${rented} están alquiladas` : ''
          }. Para retirarlas, cambie su estado a Fuera de servicio.`,
        );
      }

      const { count } = await tx.implemento.deleteMany({ where });
      return {
        message: `Se eliminaron ${count} unidades de "${key.nombre}".`,
        total: count,
      };
    });
  }

  /** Asigna o reemplaza la imagen de todas las unidades de un tipo. */
  async setGroupImage(dto: ItemGroupKeyDto, file: Express.Multer.File | undefined) {
    const key = await this.resolveGroupKey(dto);
    const where = { categoriaId: key.categoriaId, nombre: key.nombre };
    const previous = await this.prisma.implemento.findMany({
      where: { ...where, imagenUrl: { not: null } },
      distinct: ['imagenUrl'],
      select: { imagenUrl: true },
    });
    const url = await this.uploads.saveImage(file, 'items');
    await this.prisma.implemento.updateMany({ where, data: { imagenUrl: url } });
    await this.removeIfUnused(previous.map((row) => row.imagenUrl));
    const [summary] = await this.summarizeGroups([key]);
    return summary;
  }

  /** Quita la imagen subida; la interfaz vuelve a la ilustración por defecto. */
  async clearGroupImage(dto: ItemGroupKeyDto) {
    const key = await this.resolveGroupKey(dto);
    const where = { categoriaId: key.categoriaId, nombre: key.nombre };
    const previous = await this.prisma.implemento.findMany({
      where: { ...where, imagenUrl: { not: null } },
      distinct: ['imagenUrl'],
      select: { imagenUrl: true },
    });
    await this.prisma.implemento.updateMany({ where, data: { imagenUrl: null } });
    await this.removeIfUnused(previous.map((row) => row.imagenUrl));
    const [summary] = await this.summarizeGroups([key]);
    return summary;
  }

  private async removeIfUnused(urls: Array<string | null>): Promise<void> {
    for (const url of urls) {
      if (!url) continue;
      const stillUsed = await this.prisma.implemento.count({ where: { imagenUrl: url } });
      if (stillUsed === 0) await this.uploads.remove(url);
    }
  }

  private async resolveGroupKey(dto: ItemGroupKeyDto): Promise<GroupKey> {
    const nombre = normalizeSearchTerm(dto.nombre) ?? '';
    const existing = await this.prisma.implemento.findFirst({
      where: {
        categoriaId: dto.categoriaId,
        nombre: { equals: nombre, mode: 'insensitive' },
      },
      select: { categoriaId: true, nombre: true },
    });
    if (!existing) throw new NotFoundException('Implemento no encontrado.');
    return existing;
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

        // Si ya existe el tipo con otra capitalización o espacios, se reutiliza su
        // nombre para que las nuevas unidades sumen al mismo stock.
        const nombreNormalizado = normalizeSearchTerm(dto.nombre) ?? dto.nombre.trim();
        const existente = await tx.implemento.findFirst({
          where: {
            categoriaId: categoria.id,
            nombre: { equals: nombreNormalizado, mode: 'insensitive' },
          },
          select: { nombre: true, imagenUrl: true },
          orderBy: { id: 'desc' },
        });
        const nombre = existente?.nombre ?? nombreNormalizado;
        // Las unidades nuevas heredan la imagen del tipo.
        const imagenUrl = existente?.imagenUrl ?? null;

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
              nombre,
              imagenUrl,
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
