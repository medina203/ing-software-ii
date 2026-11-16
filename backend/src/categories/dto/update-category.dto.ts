import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  SERIAL_PREFIX_MAX_LENGTH,
  SERIAL_PREFIX_MIN_LENGTH,
  SERIAL_PREFIX_PATTERN,
} from '../../common/utils/serial';

const normalizePrefix = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @Transform(normalizePrefix)
  @IsString()
  @MinLength(SERIAL_PREFIX_MIN_LENGTH, {
    message: 'El prefijo debe tener al menos 2 caracteres.',
  })
  @MaxLength(SERIAL_PREFIX_MAX_LENGTH, {
    message: 'El prefijo no puede superar 10 caracteres.',
  })
  @Matches(SERIAL_PREFIX_PATTERN, {
    message: 'El prefijo debe iniciar con una letra y contener solo letras o números.',
  })
  prefijo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  descripcion?: string;
}
