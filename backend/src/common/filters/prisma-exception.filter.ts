import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const uniqueTarget = Array.isArray(exception.meta?.target)
      ? exception.meta.target.join(', ')
      : String(exception.meta?.target ?? '');

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocurrió un error inesperado en la base de datos.';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const fieldLabels: Record<string, string> = {
          email: 'correo electrónico',
          documento_identidad: 'documento de identidad',
          codigo_serie: 'código de serie',
          codigo_alquiler: 'código de alquiler',
          nombre: 'nombre',
          alquiler_id: 'alquiler',
        };
        const fields = uniqueTarget
          .split(', ')
          .map((field) => fieldLabels[field] ?? field)
          .join(', ');
        message = fields
          ? `Ya existe un registro con el mismo ${fields}.`
          : 'Ya existe un registro con un valor único duplicado.';
        break;
      }
      case 'P2003':
        status = HttpStatus.CONFLICT;
        message =
          'No se puede completar la operación porque el registro está relacionado con otros datos.';
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'El registro solicitado no existe.';
        break;
      case 'P2034':
        status = HttpStatus.CONFLICT;
        message =
          'La operación coincidió con otro cambio en el inventario. Intente nuevamente.';
        break;
      default:
        this.logger.error(
          `Error Prisma ${exception.code}: ${exception.message}`,
          exception.stack,
        );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Error' : undefined,
    });
  }
}
