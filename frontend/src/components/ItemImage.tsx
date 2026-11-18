import { useState } from 'react';
import { assetUrl, itemIllustration, itemPhoto } from '../lib/assets';
import { cn } from '../lib/cn';

interface ItemImageProps {
  nombre: string;
  categoria?: string;
  imagenUrl?: string | null;
  className?: string;
}

/**
 * Imagen de un tipo de implemento, en este orden: foto subida por el ADMIN,
 * foto incluida en el sistema según el nombre e ilustración del tipo. Si una
 * imagen no carga, pasa a la siguiente.
 */
export function ItemImage({ nombre, categoria, imagenUrl, className }: ItemImageProps) {
  const [failed, setFailed] = useState<string[]>([]);
  const uploaded = assetUrl(imagenUrl);
  const photo = itemPhoto(nombre);
  const illustration = itemIllustration(nombre, categoria);

  const candidates: Array<{ src: string; kind: 'subida' | 'foto' | 'ilustracion' }> = [
    ...(uploaded ? [{ src: uploaded, kind: 'subida' as const }] : []),
    ...(photo ? [{ src: photo, kind: 'foto' as const }] : []),
    { src: illustration, kind: 'ilustracion' },
  ];
  const current =
    candidates.find((candidate) => !failed.includes(candidate.src)) ??
    candidates[candidates.length - 1];

  // Las fotos de catálogo tienen fondo blanco: se muestran completas, sin recortar.
  const isCatalogPhoto = current.kind === 'foto';

  return (
    <img
      src={current.src}
      alt={nombre}
      loading="lazy"
      decoding="async"
      data-kind={current.kind}
      onError={() => setFailed((list) => [...list, current.src])}
      className={cn(
        'h-full w-full',
        isCatalogPhoto ? 'bg-white object-contain p-3' : 'object-cover',
        className,
      )}
    />
  );
}
