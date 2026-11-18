import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Identifica un tipo de implemento: todas las unidades con la misma categoría y nombre. */
export class ItemGroupKeyDto {
  @Type(() => Number)
  @IsInt({ message: 'La categoría es obligatoria.' })
  @Min(1)
  categoriaId!: number;

  @IsString()
  @MinLength(1, { message: 'El nombre del implemento es obligatorio.' })
  @MaxLength(140)
  nombre!: string;
}

/** Cambios que se aplican a todas las unidades de un tipo. */
export class UpdateItemGroupDto extends ItemGroupKeyDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre es obligatorio.' })
  @MaxLength(140)
  nuevoNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número válido.' })
  @IsPositive({ message: 'El precio debe ser mayor que cero.' })
  precioAlquilerDiario?: number;
}
