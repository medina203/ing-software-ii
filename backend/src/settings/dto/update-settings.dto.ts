import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  COLORES_PRIMARIOS,
  MAX_ARTICULOS_CARRUSEL,
  TAMANOS_FUENTE,
  TEMAS,
} from '../settings.constants';

export class CarouselArticleDto {
  @IsString()
  @MinLength(3, { message: 'El título del artículo debe tener al menos 3 caracteres.' })
  @MaxLength(80)
  titulo!: string;

  @IsString()
  @MinLength(3, { message: 'El texto del artículo debe tener al menos 3 caracteres.' })
  @MaxLength(220)
  texto!: string;

  /** Imagen subida por /settings/images o ilustración incluida (/ilustraciones/...). */
  @IsOptional()
  @IsString()
  @Matches(/^\/(uploads|ilustraciones)\/[\w./-]+$/, {
    message: 'La imagen del artículo no es válida.',
  })
  @MaxLength(300)
  imagenUrl?: string | null;

  /** Ruta interna del sistema, por ejemplo /inventario. */
  @IsOptional()
  @IsString()
  @Matches(/^\/[\w/-]*$/, {
    message: 'El enlace debe ser una ruta interna, por ejemplo /inventario.',
  })
  @MaxLength(80)
  enlace?: string | null;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(TEMAS, { message: 'El tema debe ser claro u oscuro.' })
  tema?: (typeof TEMAS)[number];

  @IsOptional()
  @IsIn(TAMANOS_FUENTE, { message: 'El tamaño de fuente no es válido.' })
  tamanoFuente?: (typeof TAMANOS_FUENTE)[number];

  @IsOptional()
  @IsIn(COLORES_PRIMARIOS, { message: 'El color principal no es válido.' })
  colorPrimario?: (typeof COLORES_PRIMARIOS)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ARTICULOS_CARRUSEL, {
    message: `El carrusel admite como máximo ${MAX_ARTICULOS_CARRUSEL} artículos.`,
  })
  @ValidateNested({ each: true })
  @Type(() => CarouselArticleDto)
  carrusel?: CarouselArticleDto[];
}
