import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { MetodoPago } from '@prisma/client';

export class CreatePaymentDto {
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto del pago debe ser un número válido.' },
  )
  @IsPositive({ message: 'El monto del pago debe ser mayor que cero.' })
  monto: number;

  @IsEnum(MetodoPago, { message: 'El método de pago no es válido.' })
  metodoPago: MetodoPago;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referencia?: string;
}
