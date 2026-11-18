import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { assertJwtSecret } from '../common/config/production';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginAttemptsService } from './login-attempts.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = assertJwtSecret(configService.get<string>('JWT_SECRET'));

        return {
          secret,
          signOptions: {
            expiresIn: Number(
              configService.get<string>('JWT_EXPIRES_IN_SECONDS', '28800'),
            ),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LoginAttemptsService],
  exports: [AuthService, LoginAttemptsService, JwtModule],
})
export class AuthModule {}
