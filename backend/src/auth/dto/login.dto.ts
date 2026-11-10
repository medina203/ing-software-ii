import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email: string;

  @IsString({ message: 'La contraseña es obligatoria.' })
  @MinLength(1, { message: 'La contraseña es obligatoria.' })
  password: string;
}
