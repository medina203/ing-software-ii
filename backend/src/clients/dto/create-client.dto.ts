import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  @MinLength(3, { message: 'El documento debe tener al menos 3 caracteres.' })
  @MaxLength(30)
  documentoIdentidad: string;

  @IsString()
  @MinLength(2, { message: 'Los nombres son obligatorios.' })
  @MaxLength(100)
  nombres: string;

  @IsString()
  @MinLength(2, { message: 'Los apellidos son obligatorios.' })
  @MaxLength(100)
  apellidos: string;

  @IsString()
  @MinLength(7, { message: 'El teléfono debe tener al menos 7 caracteres.' })
  @MaxLength(30)
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
