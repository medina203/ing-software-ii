import { expect, test } from '@playwright/test';
import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

/** RF-22: recuperación de contraseña desde la pantalla de inicio de sesión. */
const prisma = new PrismaClient();
const stamp = Date.now().toString(36);
const email = `recupera.ui.${stamp}@prueba.local`;
let userId: number;

test.beforeAll(async () => {
  const user = await prisma.usuario.create({
    data: {
      nombre: 'Empleado Recuperación',
      email,
      passwordHash: await bcrypt.hash('ClaveVieja2026', 10),
      rol: Rol.EMPLEADO,
    },
  });
  userId = user.id;
});

test.afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

test('el login ya no muestra cuentas de demostración y permite pedir el enlace', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page.getByText('Cuentas de demostración')).toHaveCount(0);

  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page).toHaveURL(/\/recuperar-contrasena$/);
  await page.getByPlaceholder('Correo electrónico').fill(email);
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();

  // El servidor guardó un enlace vigente (solo el hash) para ese usuario.
  const tokens = await prisma.tokenRecuperacion.findMany({
    where: { usuarioId: userId, usadoEn: null },
  });
  expect(tokens).toHaveLength(1);
  expect(tokens[0].expiraEn.getTime()).toBeGreaterThan(Date.now());
});

test('el enlace del correo permite crear la contraseña nueva e iniciar sesión', async ({
  page,
}) => {
  // Simula el enlace recibido por correo.
  const token = randomBytes(32).toString('base64url');
  await prisma.tokenRecuperacion.deleteMany({ where: { usuarioId: userId } });
  await prisma.tokenRecuperacion.create({
    data: {
      usuarioId: userId,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiraEn: new Date(Date.now() + 30 * 60_000),
    },
  });

  await page.goto(`/restablecer-contrasena?token=${token}`);
  await expect(
    page.getByRole('heading', { name: 'Crea una contraseña nueva' }),
  ).toBeVisible();
  // El token se quita de la barra de direcciones.
  await expect(page).toHaveURL(/\/restablecer-contrasena$/);

  await page.getByPlaceholder('Nueva contraseña', { exact: true }).fill('ClaveNueva2026');
  await page.getByPlaceholder('Confirmar contraseña').fill('ClaveNueva2026');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(
    page.getByRole('heading', { name: 'Contraseña actualizada' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('ClaveNueva2026');
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).toHaveURL(/\/inventario$/);

  // Reutilizar el mismo enlace ya no funciona.
  await page.evaluate(() => localStorage.clear());
  await page.goto(`/restablecer-contrasena?token=${token}`);
  await expect(page.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible();
});
