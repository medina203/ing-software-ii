import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { frontendDist, serveFrontend } from './common/config/frontend-static';
import { isProduction } from './common/config/production';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { UPLOADS_PUBLIC_PREFIX, uploadsRoot } from './uploads/uploads.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Detrás del proxy de Railway la IP real del cliente llega en X-Forwarded-For
  // (necesaria para el bloqueo por intentos fallidos de login).
  if (isProduction()) app.set('trust proxy', 1);

  // Las imágenes subidas se muestran desde el frontend (otro origen en desarrollo).
  // blob: permite la vista previa de la foto antes de subirla.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: { 'img-src': ["'self'", 'data:', 'blob:'] },
      },
    }),
  );
  app.useStaticAssets(uploadsRoot(), {
    prefix: UPLOADS_PUBLIC_PREFIX,
    maxAge: '7d',
    index: false,
    dotfiles: 'deny',
  });
  const dist = frontendDist();
  if (dist) {
    serveFrontend(app, dist);
    logger.log(`Frontend servido desde ${dist}`);
  }

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  // Puerto local de la API: 4000. Railway define PORT automáticamente.
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  logger.log(`API disponible en http://localhost:${port}/api`);
  logger.log(`Health check: http://localhost:${port}/api/health`);
}

void bootstrap();
