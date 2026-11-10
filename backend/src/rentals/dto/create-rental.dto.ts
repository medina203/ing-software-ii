import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RentalItemDto {
  @Type(() => Number)
  @IsInt({ message: 'El implemento debe ser válido.' })
  @Min(1)
  implementoId: number;
}

export class CreateRentalDto {
  @Type(() => Number)
  @IsInt({ message: 'El cliente es obligatorio.' })
  @Min(1)
  clienteId: number;

  @IsDateString(
    {},
    { message: 'La fecha pactada de devolución no es válida.' },
  )
  fechaPactadaDevolucion: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'El alquiler debe incluir al menos un implemento.',
  })
  @ValidateNested({ each: true })
  @Type(() => RentalItemDto)
  implementos: RentalItemDto[];
}
