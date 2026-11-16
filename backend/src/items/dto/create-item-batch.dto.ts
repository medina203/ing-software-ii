import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { CreateItemDto } from './create-item.dto';

export const MAX_ITEM_BATCH_QUANTITY = 100;

export class CreateItemBatchDto extends CreateItemDto {
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  @Max(MAX_ITEM_BATCH_QUANTITY, {
    message: `La cantidad no puede superar ${MAX_ITEM_BATCH_QUANTITY} unidades.`,
  })
  cantidad: number;
}
