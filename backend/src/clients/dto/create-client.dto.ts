import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Documento: tipo y número sin letras ni espacios.
 * - CC, CE y TI: 6 a 10 dígitos (CC-10324567).
 * - NIT: 9 dígitos y dígito de verificación (NIT-900123456-7).
 */
export const DOCUMENTO_REGEX = /^(?:(?:CC|CE|TI)-\d{6,10}|NIT-\d{9}-\d)$/;
/** Teléfono colombiano: 7 a 10 dígitos, solo números. */
export const TELEFONO_REGEX = /^\d{7,10}$/;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateClientDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(DOCUMENTO_REGEX, {
    message:
      'El documento debe tener el tipo y solo números: CC, CE o TI con 6 a 10 dígitos, o NIT con 9 dígitos y dígito de verificación.',
  })
  documentoIdentidad: string;

  @IsString()
  @MinLength(2, { message: 'Los nombres son obligatorios.' })
  @MaxLength(100)
  nombres: string;

  @IsString()
  @MinLength(2, { message: 'Los apellidos son obligatorios.' })
  @MaxLength(100)
  apellidos: string;

  @Transform(trim)
  @IsString()
  @Matches(TELEFONO_REGEX, {
    message: 'El teléfono debe tener entre 7 y 10 dígitos, solo números.',
  })
  telefono: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(160)
  correo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  direccion?: string;
}
