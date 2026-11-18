import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DOCUMENTO_REGEX, TELEFONO_REGEX } from './create-client.dto';

export class UpdateClientDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(DOCUMENTO_REGEX, {
    message:
      'El documento debe tener el tipo y solo números: CC, CE o TI con 6 a 10 dígitos, o NIT con 9 dígitos y dígito de verificación.',
  })
  documentoIdentidad?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Los nombres son obligatorios.' })
  @MaxLength(100)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Los apellidos son obligatorios.' })
  @MaxLength(100)
  apellidos?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(TELEFONO_REGEX, {
    message: 'El teléfono debe tener entre 7 y 10 dígitos, solo números.',
  })
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(160)
  correo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  direccion?: string;
}
