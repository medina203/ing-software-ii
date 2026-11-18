import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoAlquiler, EstadoImplemento, Prisma, Rol } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthService } from '../auth/auth.service';
import {
  createInvoiceForRental,
  getPendingInvoices,
  markOverdueInvoices,
  accrueOverdueInvoices,
  presentInvoice,
  type PendingInvoicesResult,
} from '../common/utils/billing';
import { parseDateOnly, startOfBusinessToday, yyyymmdd } from '../common/utils/dates';
import {
  markOverdueRentals,
  rentalStatusWhere,
  withEffectiveRentalStatus,
} from '../common/utils/rental-status';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { ListRentalsQueryDto } from './dto/list-rentals-query.dto';
import { userSummary, clientSummary, itemSummary } from '../common/prisma-selects';

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
  factura: {
    include: {
      pagos: {
        include: { usuario: { select: userSummary } },
        orderBy: { fechaPago: 'desc' },
      },
    },
  },
} satisfies Prisma.AlquilerInclude;

type RentalWithRelations = Prisma.AlquilerGetPayload<{ include: typeof rentalInclude }>;

@Injectable()
export class RentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll(query: ListRentalsQueryDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const term = query.search?.trim();

    const where: Prisma.AlquilerWhereInput = {
      AND: [
        query.estado ? rentalStatusWhere(query.estado) : {},
        term
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
          : {},
      ],
    };

    const [rows, total] = await Promise.all([
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
      data: rows.map((row) => this.present(row)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const alquiler = await this.prisma.alquiler.findUnique({
      where: { id },
      include: rentalInclude,
    });

    if (!alquiler) {
      throw new NotFoundException('Alquiler no encontrado.');
    }

    return this.present(alquiler);
  }

  /** Respuesta con estados efectivos (vencido por fecha) sin escribir en la BD. */
  private present<T extends RentalWithRelations>(alquiler: T): T {
    return {
      ...withEffectiveRentalStatus(alquiler),
      factura: alquiler.factura ? presentInvoice(alquiler.factura, alquiler) : null,
    };
  }

  async create(dto: CreateRentalDto, usuario: AuthenticatedUser) {
    const fechaPactada = parseDateOnly(dto.fechaPactadaDevolucion);
    if (fechaPactada < startOfBusinessToday()) {
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

    await markOverdueRentals(this.prisma);
    await markOverdueInvoices(this.prisma);
    await accrueOverdueInvoices(this.prisma);
    const pendingBefore = await getPendingInvoices(this.prisma, dto.clienteId);
    const authorization = await this.resolveCarteraAuthorization(
      dto,
      usuario,
      pendingBefore,
    );

    return this.prisma.$transaction(
      async (tx) => {
        const pendingAtCreation = await getPendingInvoices(tx, dto.clienteId);

        if (pendingAtCreation.cantidad > 0 && !authorization) {
          throw new ForbiddenException(
            'El cliente tiene saldo pendiente. Un ADMIN debe autorizar el nuevo alquiler e indicar el motivo.',
          );
        }

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
          (implemento) => implemento.estado !== EstadoImplemento.DISPONIBLE,
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
            usuarioId: usuario.id,
            fechaPactadaDevolucion: fechaPactada,
            estado: EstadoAlquiler.ACTIVO,
            observaciones: dto.observaciones?.trim() || null,
            detalles: {
              create: implementoIds.map((implementoId) => ({
                implementoId,
                precioUnitario: implementosPorId.get(implementoId)!.precioAlquilerDiario,
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

        await createInvoiceForRental(tx, {
          alquilerId: alquilerTemporal.id,
          clienteId: dto.clienteId,
          fechaEmision: alquilerTemporal.fechaAlquiler,
          fechaVencimiento: fechaPactada,
          items: implementoIds.map((implementoId) => ({
            precioUnitario: implementosPorId.get(implementoId)!.precioAlquilerDiario,
          })),
        });

        if (pendingAtCreation.cantidad > 0 && authorization) {
          const referenceInvoice = pendingAtCreation.facturas[0];

          await tx.autorizacionCartera.create({
            data: {
              clienteId: dto.clienteId,
              facturaId: referenceInvoice.id,
              alquilerId: alquilerTemporal.id,
              usuarioSolicitanteId: usuario.id,
              administradorId: authorization.administradorId,
              saldoPendiente: pendingAtCreation.totalSaldo,
              motivo: authorization.motivo,
            },
          });
        }

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

        const creado = await tx.alquiler.findUniqueOrThrow({
          where: { id: alquilerTemporal.id },
          include: rentalInclude,
        });
        return this.present(creado);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  }

  private async resolveCarteraAuthorization(
    dto: CreateRentalDto,
    usuario: AuthenticatedUser,
    pending: PendingInvoicesResult,
  ) {
    if (pending.cantidad === 0) {
      return null;
    }

    const motivo = dto.autorizacionCartera?.motivo?.trim();
    if (!motivo) {
      throw new ForbiddenException(
        'El cliente tiene saldo pendiente. Un ADMIN debe autorizar el nuevo alquiler e indicar el motivo.',
      );
    }

    if (usuario.rol === Rol.ADMIN) {
      return { administradorId: usuario.id, motivo };
    }

    const adminEmail = dto.autorizacionCartera?.adminEmail?.trim();
    const adminPassword = dto.autorizacionCartera?.adminPassword;

    if (!adminEmail || !adminPassword) {
      throw new ForbiddenException(
        'El cliente tiene saldo pendiente. Ingrese las credenciales de un ADMIN y el motivo de la autorización.',
      );
    }

    const administrador = await this.authService.validateAdminCredentials(
      adminEmail,
      adminPassword,
      `rental-auth:user-${usuario.id}`,
    );

    return { administradorId: administrador.id, motivo };
  }
}
