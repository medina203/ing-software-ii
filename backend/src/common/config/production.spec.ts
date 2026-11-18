import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { frontendDist, isBackendPath } from './frontend-static';
import { DEV_JWT_SECRET, assertJwtSecret, readInitialAdmin } from './production';

const prod = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;
const dev = { NODE_ENV: 'development' } as NodeJS.ProcessEnv;

describe('assertJwtSecret', () => {
  it('exige que exista', () => {
    expect(() => assertJwtSecret(undefined, dev)).toThrow('Falta la variable');
  });

  it('en desarrollo acepta el secreto de ejemplo', () => {
    expect(assertJwtSecret(DEV_JWT_SECRET, dev)).toBe(DEV_JWT_SECRET);
  });

  it('en producción rechaza el secreto de ejemplo y los cortos', () => {
    expect(() => assertJwtSecret(DEV_JWT_SECRET, prod)).toThrow('valor de ejemplo');
    expect(() => assertJwtSecret('corto', prod)).toThrow('al menos 32');
  });

  it('en producción acepta un secreto propio y largo', () => {
    const secret = 'x'.repeat(48);
    expect(assertJwtSecret(secret, prod)).toBe(secret);
  });
});

describe('readInitialAdmin', () => {
  it('sin variables no crea administrador', () => {
    expect(readInitialAdmin({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('normaliza el correo y usa un nombre por defecto', () => {
    expect(
      readInitialAdmin({
        ADMIN_EMAIL: ' Dueno@Negocio.com ',
        ADMIN_PASSWORD: 'ClaveSegura2026',
      } as NodeJS.ProcessEnv),
    ).toEqual({
      nombre: 'Administrador',
      email: 'dueno@negocio.com',
      password: 'ClaveSegura2026',
    });
  });

  it('rechaza configuraciones incompletas o inválidas', () => {
    expect(() =>
      readInitialAdmin({ ADMIN_EMAIL: 'a@b.co' } as NodeJS.ProcessEnv),
    ).toThrow('juntos');
    expect(() =>
      readInitialAdmin({
        ADMIN_EMAIL: 'no-es-correo',
        ADMIN_PASSWORD: '12345678',
      } as NodeJS.ProcessEnv),
    ).toThrow('correo válido');
    expect(() =>
      readInitialAdmin({
        ADMIN_EMAIL: 'a@b.co',
        ADMIN_PASSWORD: '123',
      } as NodeJS.ProcessEnv),
    ).toThrow('entre 8 y 72');
  });
});

describe('frontend estático', () => {
  it('solo se activa con FRONTEND_DIST apuntando a una carpeta con index.html', () => {
    expect(frontendDist({} as NodeJS.ProcessEnv)).toBeNull();
    const dir = mkdtempSync(join(tmpdir(), 'dist-'));
    expect(frontendDist({ FRONTEND_DIST: dir } as NodeJS.ProcessEnv)).toBeNull();
    writeFileSync(join(dir, 'index.html'), '<!doctype html>');
    expect(frontendDist({ FRONTEND_DIST: dir } as NodeJS.ProcessEnv)).toBe(dir);
  });

  it('distingue rutas de la API y de fotos de las rutas del frontend', () => {
    expect(isBackendPath('/api')).toBe(true);
    expect(isBackendPath('/api/health')).toBe(true);
    expect(isBackendPath('/uploads/items/a.webp')).toBe(true);
    expect(isBackendPath('/inventario')).toBe(false);
    expect(isBackendPath('/apiarios')).toBe(false);
  });
});
