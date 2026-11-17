import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoFactura } from '@prisma/client';

export class ListInvoicesQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(EstadoFactura, { message: 'El estado de la factura no es válido.' })
  estado?: EstadoFactura;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  clienteId?: number;
}
