import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EstadoImplemento } from '@prisma/client';

export class ReturnItemDto {
  @Type(() => Number)
  @IsInt({ message: 'El implemento debe ser válido.' })
  @Min(1)
  implementoId: number;

  @IsEnum(EstadoImplemento, {
    message: 'El estado final del implemento no es válido.',
  })
  estadoFinal: EstadoImplemento;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  observaciones?: string;
}

export class CreateReturnDto {
  @Type(() => Number)
  @IsInt({ message: 'El alquiler es obligatorio.' })
  @Min(1)
  alquilerId: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'Debe registrar al menos un implemento en la devolución.',
  })
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  implementos: ReturnItemDto[];
}
