import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EstadoImplemento } from '@prisma/client';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre es obligatorio.' })
  @MaxLength(140)
  nombre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La categoría es obligatoria.' })
  @Min(1)
  categoriaId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número válido.' })
  @IsPositive({ message: 'El precio debe ser mayor que cero.' })
  precioAlquilerDiario?: number;

  @IsOptional()
  @IsEnum(EstadoImplemento, { message: 'El estado del implemento no es válido.' })
  estado?: EstadoImplemento;
}
