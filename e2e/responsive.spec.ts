import { expect, test, type Page } from '@playwright/test';

/**
 * RNF de usabilidad (ISO/IEC 25010 – capacidad de interacción): en un celular
 * (375 px) ninguna pantalla debe ser más ancha que la vista. Las tablas anchas
 * se desplazan dentro de su tarjeta, no arrastran toda la página.
 */
async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill('admin@obragest.local');
  await page.locator('#password').fill('Admin123*');
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function expectNoHorizontalOverflow(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  const { scrollWidth, viewport } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(scrollWidth, `${path} es más ancha que la pantalla`).toBeLessThanOrEqual(
    viewport + 1,
  );
}

test.use({ viewport: { width: 375, height: 812 } });

test('en celular ninguna pantalla se desborda horizontalmente', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);

  const fixed = [
    '/',
    '/inventario',
    '/clientes',
    '/alquileres',
    '/alquileres/nuevo',
    '/devoluciones',
    '/cartera',
    '/reportes',
    '/categorias',
    '/usuarios',
    '/apariencia',
    '/perfil',
  ];
  for (const path of fixed) await expectNoHorizontalOverflow(page, path);

  // Pantallas con tablas anchas: detalle de un alquiler y registro de devolución.
  await page.goto('/alquileres');
  await page.waitForLoadState('networkidle');
  const detail = await page
    .locator('a[href^="/alquileres/"]:not([href$="nuevo"])')
    .first()
    .getAttribute('href');
  expect(detail).toBeTruthy();
  await expectNoHorizontalOverflow(page, detail!);

  await page.goto('/devoluciones');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Recibir' }).first().click();
  await expect(page).toHaveURL(/\/devoluciones\/nueva\/\d+$/);
  await expectNoHorizontalOverflow(page, new URL(page.url()).pathname);
});
