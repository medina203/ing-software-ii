/**
 * Reduce una foto antes de subirla: las cámaras de celular generan archivos de
 * varios MB. Se limita el lado mayor y se exporta a WEBP (o JPEG si el
 * navegador no lo soporta). Si no se puede procesar, se envía el original.
 */
export async function resizeImage(
  file: File,
  maxSide = 1280,
  quality = 0.85,
): Promise<Blob> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function')
    return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const toBlob = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    const webp = await toBlob('image/webp');
    if (webp && webp.type === 'image/webp') return webp;
    return (await toBlob('image/jpeg')) ?? file;
  } catch {
    return file;
  }
}

export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

/** Construye el FormData con la imagen ya reducida. */
export async function imageFormData(
  file: File,
  fields: Record<string, string | number> = {},
): Promise<FormData> {
  const blob = await resizeImage(file);
  const extension =
    blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
  form.append('imagen', blob, `imagen.${extension}`);
  return form;
}

/** Cabeceras para enviar FormData (la API usa JSON por defecto). */
export const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };
