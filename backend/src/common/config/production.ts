/**
 * Reglas de configuración para producción (despliegue en Railway u otro servidor).
 * Se validan al arrancar para fallar rápido con un mensaje claro en español.
 */

export const DEV_JWT_SECRET =
  'desarrollo-cambia-este-secreto-por-uno-largo-y-aleatorio-2026';
export const MIN_JWT_SECRET_LENGTH = 32;

export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production';
}

/** En producción exige un JWT_SECRET propio y largo; en desarrollo solo que exista. */
export function assertJwtSecret(
  secret: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (!secret) {
    throw new Error('Falta la variable de entorno JWT_SECRET. Revise backend/.env.');
  }
  if (isProduction(env)) {
    if (secret === DEV_JWT_SECRET) {
      throw new Error(
        'JWT_SECRET usa el valor de ejemplo. En producción configure un secreto propio.',
      );
    }
    if (secret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres en producción.`,
      );
    }
  }
  return secret;
}

export interface InitialAdminConfig {
  nombre: string;
  email: string;
  password: string;
}

/**
 * Lee ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME. Devuelve null si no están
 * definidos (no se crea ningún usuario). Lanza error si están incompletos o inválidos.
 */
export function readInitialAdmin(
  env: NodeJS.ProcessEnv = process.env,
): InitialAdminConfig | null {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD ?? '';
  if (!email && !password) return null;
  if (!email || !password) {
    throw new Error(
      'Defina ADMIN_EMAIL y ADMIN_PASSWORD juntos para crear el administrador inicial.',
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL no es un correo válido.');
  }
  if (password.length < 8 || password.length > 72) {
    throw new Error('ADMIN_PASSWORD debe tener entre 8 y 72 caracteres.');
  }
  const nombre = env.ADMIN_NAME?.trim() || 'Administrador';
  return { nombre, email, password };
}
