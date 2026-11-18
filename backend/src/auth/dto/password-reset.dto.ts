import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  @MaxLength(160, { message: 'El correo no puede superar 160 caracteres.' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @Length(20, 128, { message: 'El enlace no es válido.' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres.' })
  newPassword: string;
}
