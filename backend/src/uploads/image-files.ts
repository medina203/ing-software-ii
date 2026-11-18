/// <reference types="multer" />
import { BadRequestException } from '@nestjs/common';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageExtension = 'jpg' | 'png' | 'webp';

/**
 * Detecta el formato por la firma del archivo (magic bytes) y no por la
 * extensión ni el Content-Type que envía el cliente, que se pueden falsear.
 */
export function detectImageExtension(buffer: Buffer): ImageExtension | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export function assertValidImage(file: Express.Multer.File | undefined): ImageExtension {
  if (!file || !file.buffer || file.size === 0) {
    throw new BadRequestException('Seleccione una imagen.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new BadRequestException('La imagen no puede superar 5 MB.');
  }
  const extension = detectImageExtension(file.buffer);
  if (!extension) {
    throw new BadRequestException(
      'Formato no permitido. Use una imagen JPG, PNG o WEBP.',
    );
  }
  return extension;
}
