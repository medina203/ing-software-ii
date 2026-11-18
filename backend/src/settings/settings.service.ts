import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import type { ArticuloCarrusel } from './settings.constants';

const ID = 1;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  /** Configuración vigente; si no existe se crea con los valores por defecto. */
  async get() {
    const row = await this.prisma.configuracion.upsert({
      where: { id: ID },
      update: {},
      create: { id: ID },
    });
    return this.present(row);
  }

  async update(dto: UpdateSettingsDto, usuarioId: number) {
    await this.get();
    const row = await this.prisma.configuracion.update({
      where: { id: ID },
      data: {
        ...(dto.tema ? { tema: dto.tema } : {}),
        ...(dto.tamanoFuente ? { tamanoFuente: dto.tamanoFuente } : {}),
        ...(dto.colorPrimario ? { colorPrimario: dto.colorPrimario } : {}),
        ...(dto.carrusel
          ? {
              carrusel: dto.carrusel.map((articulo) => ({
                titulo: articulo.titulo.trim(),
                texto: articulo.texto.trim(),
                imagenUrl: articulo.imagenUrl || null,
                enlace: articulo.enlace || null,
              })) as unknown as Prisma.InputJsonValue,
            }
          : {}),
        actualizadoPor: usuarioId,
      },
    });
    return this.present(row);
  }

  async setLoginImage(file: Express.Multer.File | undefined, usuarioId: number) {
    const current = await this.get();
    const url = await this.uploads.saveImage(file, 'branding');
    const row = await this.prisma.configuracion.update({
      where: { id: ID },
      data: { imagenLoginUrl: url, actualizadoPor: usuarioId },
    });
    await this.uploads.remove(current.imagenLoginUrl);
    return this.present(row);
  }

  async clearLoginImage(usuarioId: number) {
    const current = await this.get();
    const row = await this.prisma.configuracion.update({
      where: { id: ID },
      data: { imagenLoginUrl: null, actualizadoPor: usuarioId },
    });
    await this.uploads.remove(current.imagenLoginUrl);
    return this.present(row);
  }

  /** Sube una imagen para un artículo del carrusel y devuelve su URL. */
  async uploadImage(file: Express.Multer.File | undefined) {
    return { url: await this.uploads.saveImage(file, 'branding') };
  }

  private present(row: Prisma.ConfiguracionGetPayload<object>) {
    return {
      tema: row.tema,
      tamanoFuente: row.tamanoFuente,
      colorPrimario: row.colorPrimario,
      imagenLoginUrl: row.imagenLoginUrl,
      carrusel: (Array.isArray(row.carrusel)
        ? row.carrusel
        : []) as unknown as ArticuloCarrusel[],
      updatedAt: row.updatedAt,
    };
  }
}
