import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { extname, join, resolve } from 'path';

/**
 * Carpeta del frontend compilado (frontend/dist). Solo se usa si FRONTEND_DIST
 * está definida; así en desarrollo el frontend sigue corriendo con Vite.
 */
export function frontendDist(env: NodeJS.ProcessEnv = process.env): string | null {
  const dir = env.FRONTEND_DIST?.trim();
  if (!dir) return null;
  const absolute = resolve(dir);
  return existsSync(join(absolute, 'index.html')) ? absolute : null;
}

/** Rutas que pertenecen a la API o a los archivos subidos, nunca al frontend. */
export function isBackendPath(path: string): boolean {
  return /^\/(api|uploads)(\/|$)/.test(path);
}

/**
 * Sirve el frontend desde el mismo servidor que la API (un solo servicio, un solo
 * dominio, sin CORS). Los archivos con hash de Vite se guardan en caché un año;
 * index.html nunca, para que cada despliegue se vea de inmediato.
 * Las rutas del frontend (/inventario, /alquileres/3…) devuelven index.html.
 */
export function serveFrontend(app: NestExpressApplication, dist: string): void {
  app.useStaticAssets(dist, {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${join(dist, 'assets')}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    },
  });

  const indexHtml = join(dist, 'index.html');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isPageRequest =
      (req.method === 'GET' || req.method === 'HEAD') &&
      !isBackendPath(req.path) &&
      extname(req.path) === '';
    if (!isPageRequest) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}
