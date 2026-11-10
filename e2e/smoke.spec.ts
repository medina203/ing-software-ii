import { expect, test } from '@playwright/test';

test('el endpoint de salud responde ok', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:4000/api/health');

  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({
    status: 'ok',
    service: 'inventario-alquiler-api',
  });
});

test('login de administrador y acceso al resumen operativo', async ({ page }) => {
  await page.goto('/login');

  await page.locator('#email').fill('admin@obragest.local');
  await page.locator('#password').fill('Admin123*');
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Resumen operativo' })).toBeVisible();
});
