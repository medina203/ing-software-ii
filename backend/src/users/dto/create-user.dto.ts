import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Rol } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(120)
  nombre: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(160)
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres.' })
  password: string;

  @IsOptional()
  @IsEnum(Rol, { message: 'El rol debe ser ADMIN o EMPLEADO.' })
  rol?: Rol;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
