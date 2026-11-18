export const TEMAS = ['claro', 'oscuro'] as const;
export const TAMANOS_FUENTE = ['pequena', 'normal', 'grande'] as const;
export const COLORES_PRIMARIOS = ['ambar', 'azul', 'verde', 'rojo', 'violeta'] as const;
export const MAX_ARTICULOS_CARRUSEL = 4;

export type Tema = (typeof TEMAS)[number];
export type TamanoFuente = (typeof TAMANOS_FUENTE)[number];
export type ColorPrimario = (typeof COLORES_PRIMARIOS)[number];

export interface ArticuloCarrusel {
  titulo: string;
  texto: string;
  imagenUrl?: string | null;
  enlace?: string | null;
}
