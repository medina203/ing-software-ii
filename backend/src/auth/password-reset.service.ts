import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { publicAppUrl } from '../common/config/app-url';
import { businessTimezone } from '../common/utils/dates';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginAttemptsService } from './login-attempts.service';
import { passwordResetEmail } from './password-reset-email';

export const RESET_PATH = '/restablecer-contrasena';
export const GENERIC_REQUEST_MESSAGE =
  'Si el correo pertenece a una cuenta activa, te enviamos un enlace para restablecer la contraseña. Revisa tu bandeja de entrada y la carpeta de spam.';
export const INVALID_LINK_MESSAGE =
  'El enlace no es válido o ya venció. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".';

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

interface Limit {
  max: number;
  windowMs: number;
}

/**
 * Recuperación de contraseña con enlace de un solo uso (RF-22, ISO 25010 seguridad):
 * - El token es aleatorio (256 bits); en la base de datos solo se guarda su hash.
 * - Vence a los PASSWORD_RESET_MINUTES (30 por defecto). Si se piden varios, todos
 *   sirven mientras estén vigentes; al usar uno se anulan los demás.
 * - La respuesta de la solicitud es la misma exista o no la cuenta (no revela correos).
 * - Al restablecer se cierran las sesiones abiertas antes y se libera el bloqueo de login.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly requests = new Map<string, number[]>();
  private readonly perEmail: Limit = { max: 3, windowMs: 15 * 60_000 };
  private readonly perIp: Limit = { max: 10, windowMs: 15 * 60_000 };

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  get ttlMinutes(): number {
    const value = Number(process.env.PASSWORD_RESET_MINUTES ?? 30);
    return Number.isFinite(value) && value >= 5 && value <= 24 * 60 ? value : 30;
  }

  status() {
    return { correoDisponible: this.mail.isAvailable() };
  }

  async requestReset(email: string, clientIp = 'desconocida', now = new Date()) {
    if (!this.consume(`ip:${clientIp}`, this.perIp, now.getTime())) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'TOO_MANY_REQUESTS',
          message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const response = { message: GENERIC_REQUEST_MESSAGE };
    // Límite por cuenta: se responde igual para no revelar si el correo existe.
    if (!this.consume(`email:${email}`, this.perEmail, now.getTime())) return response;

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true, email: true, activo: true },
    });
    if (!usuario?.activo) return response;

    const token = randomBytes(32).toString('base64url');
    const minutes = this.ttlMinutes;
    await this.prisma.$transaction([
      // Los enlaces anteriores sin usar siguen sirviendo hasta que venzan (si el
      // usuario pidió varios, cualquiera funciona); al usar uno se anulan todos.
      // Solo se limpian los vencidos.
      this.prisma.tokenRecuperacion.deleteMany({
        where: { usuarioId: usuario.id, usadoEn: null, expiraEn: { lte: now } },
      }),
      this.prisma.tokenRecuperacion.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashResetToken(token),
          expiraEn: new Date(now.getTime() + minutes * 60_000),
        },
      }),
    ]);

    const link = `${publicAppUrl()}${RESET_PATH}?token=${encodeURIComponent(token)}`;
    const sent = await this.mail.send(
      passwordResetEmail({
        to: usuario.email,
        nombre: usuario.nombre,
        link,
        minutes,
        requestedAt: now,
        timeZone: businessTimezone(),
      }),
    );
    if (!sent) {
      this.logger.warn(
        `No se pudo enviar el enlace de recuperación a la cuenta ${usuario.id}.`,
      );
    }
    return response;
  }

  /** Comprueba el enlace antes de mostrar el formulario. */
  async validateToken(token: string, now = new Date()) {
    const record = await this.findUsable(token, now);
    return { valido: Boolean(record) };
  }

  async resetPassword(token: string, newPassword: string, now = new Date()) {
    const record = await this.findUsable(token, now);
    if (!record) throw new BadRequestException(INVALID_LINK_MESSAGE);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      // Marca el token como usado solo si nadie lo usó entre la lectura y ahora.
      const claimed = await tx.tokenRecuperacion.updateMany({
        where: { id: record.id, usadoEn: null },
        data: { usadoEn: now },
      });
      if (claimed.count !== 1) throw new BadRequestException(INVALID_LINK_MESSAGE);

      await tx.usuario.update({
        where: { id: record.usuarioId },
        data: { passwordHash, passwordRestablecidaEn: now },
      });
      await tx.tokenRecuperacion.deleteMany({
        where: { usuarioId: record.usuarioId, usadoEn: null },
      });
    });

    this.loginAttempts.registerSuccess([`login:email:${record.usuario.email}`]);
    return { message: 'Contraseña restablecida. Ya puedes iniciar sesión con la nueva.' };
  }

  private async findUsable(token: string, now: Date) {
    if (!token || token.length < 20 || token.length > 128) return null;
    const record = await this.prisma.tokenRecuperacion.findUnique({
      where: { tokenHash: hashResetToken(token) },
      select: {
        id: true,
        usuarioId: true,
        expiraEn: true,
        usadoEn: true,
        usuario: { select: { email: true, activo: true } },
      },
    });
    if (!record || record.usadoEn || record.expiraEn <= now || !record.usuario.activo) {
      return null;
    }
    return record;
  }

  /** Ventana deslizante en memoria. Devuelve false si se superó el límite. */
  private consume(key: string, limit: Limit, now: number): boolean {
    const recent = (this.requests.get(key) ?? []).filter((t) => now - t < limit.windowMs);
    if (recent.length >= limit.max) {
      this.requests.set(key, recent);
      return false;
    }
    recent.push(now);
    this.requests.set(key, recent);
    if (this.requests.size > 10_000) this.requests.clear();
    return true;
  }

  /** Solo para pruebas. */
  resetLimits(): void {
    this.requests.clear();
  }
}
