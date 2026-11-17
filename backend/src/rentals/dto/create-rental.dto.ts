import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RentalItemDto {
  @Type(() => Number)
  @IsInt({ message: 'El implemento debe ser válido.' })
  @Min(1)
  implementoId: number;
}

export class RentalAuthorizationDto {
  @IsString()
  @MinLength(5, {
    message: 'El motivo de la autorización debe tener al menos 5 caracteres.',
  })
  @MaxLength(500)
  motivo: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo del administrador no es válido.' })
  @MaxLength(160)
  adminEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  adminPassword?: string;
}

export class CreateRentalDto {
  @Type(() => Number)
  @IsInt({ message: 'El cliente es obligatorio.' })
  @Min(1)
  clienteId: number;

  @IsDateString({}, { message: 'La fecha pactada de devolución no es válida.' })
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

  @IsOptional()
  @ValidateNested()
  @Type(() => RentalAuthorizationDto)
  autorizacionCartera?: RentalAuthorizationDto;
}
