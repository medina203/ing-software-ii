import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { MAX_IMAGE_BYTES } from '../uploads/image-files';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

const imageUpload = FileInterceptor('imagen', { limits: { fileSize: MAX_IMAGE_BYTES } });

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Público: el login necesita el tema, el color y la imagen de fondo. */
  @Public()
  @Get()
  get() {
    return this.settingsService.get();
  }

  @Roles(Rol.ADMIN)
  @Put()
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.settingsService.update(dto, usuario.id);
  }

  @Roles(Rol.ADMIN)
  @Post('login-image')
  @UseInterceptors(imageUpload)
  setLoginImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.settingsService.setLoginImage(file, usuario.id);
  }

  @Roles(Rol.ADMIN)
  @Delete('login-image')
  clearLoginImage(@CurrentUser() usuario: AuthenticatedUser) {
    return this.settingsService.clearLoginImage(usuario.id);
  }

  @Roles(Rol.ADMIN)
  @Post('images')
  @UseInterceptors(imageUpload)
  uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.settingsService.uploadImage(file);
  }
}
