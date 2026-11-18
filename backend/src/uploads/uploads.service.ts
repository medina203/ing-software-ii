import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, normalize, resolve, sep } from 'path';
import { assertValidImage } from './image-files';

export const UPLOADS_PUBLIC_PREFIX = '/uploads';

export function uploadsRoot(): string {
  return resolve(process.env.UPLOADS_DIR?.trim() || join(process.cwd(), 'uploads'));
}

/**
 * Guarda imágenes en disco con nombres aleatorios y las expone bajo /uploads.
 * Solo acepta JPG, PNG o WEBP validados por firma.
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  async saveImage(
    file: Express.Multer.File | undefined,
    folder: 'items' | 'branding',
  ): Promise<string> {
    const extension = assertValidImage(file);
    const directory = join(uploadsRoot(), folder);
    await mkdir(directory, { recursive: true });
    const name = `${randomUUID()}.${extension}`;
    await writeFile(join(directory, name), file!.buffer);
    return `${UPLOADS_PUBLIC_PREFIX}/${folder}/${name}`;
  }

  /** Borra un archivo subido previamente; ignora rutas ajenas a /uploads. */
  async remove(publicUrl: string | null | undefined): Promise<void> {
    if (!publicUrl?.startsWith(`${UPLOADS_PUBLIC_PREFIX}/`)) return;
    const root = uploadsRoot();
    const target = normalize(join(root, publicUrl.slice(UPLOADS_PUBLIC_PREFIX.length)));
    if (!target.startsWith(root + sep)) return;
    try {
      await unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`No se pudo borrar ${publicUrl}: ${(error as Error).message}`);
      }
    }
  }
}
