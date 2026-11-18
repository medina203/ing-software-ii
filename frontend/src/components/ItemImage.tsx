import { useState } from 'react';
import { assetUrl, itemIllustration } from '../lib/assets';
import { cn } from '../lib/cn';

interface ItemImageProps {
  nombre: string;
  categoria?: string;
  imagenUrl?: string | null;
  className?: string;
}

/**
 * Imagen de un tipo de implemento. Usa la foto subida por el ADMIN o, si no
 * hay (o no carga), la ilustración incluida que corresponde al tipo.
 */
export function ItemImage({ nombre, categoria, imagenUrl, className }: ItemImageProps) {
  const fallback = itemIllustration(nombre, categoria);
  const [failed, setFailed] = useState<string | null>(null);
  const uploaded = assetUrl(imagenUrl);
  const src = uploaded && failed !== uploaded ? uploaded : fallback;

  return (
    <img
      src={src}
      alt={nombre}
      loading="lazy"
      decoding="async"
      onError={() => uploaded && setFailed(uploaded)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}
