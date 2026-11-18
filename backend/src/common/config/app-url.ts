/**
 * Dirección pública del sistema, usada en los enlaces de los correos.
 * Nunca se toma del encabezado Host de la petición (se podría falsificar para
 * enviar enlaces a otro sitio). Orden: APP_URL → dominio público de Railway →
 * FRONTEND_URL → frontend local de desarrollo.
 */
export function publicAppUrl(env: NodeJS.ProcessEnv = process.env): string {
  const railwayDomain = env.RAILWAY_PUBLIC_DOMAIN?.trim();
  const url =
    env.APP_URL?.trim() ||
    (railwayDomain ? `https://${railwayDomain}` : '') ||
    env.FRONTEND_URL?.split(',')[0]?.trim() ||
    'http://localhost:5173';
  return url.replace(/\/+$/, '');
}
