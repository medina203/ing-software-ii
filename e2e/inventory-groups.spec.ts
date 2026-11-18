import { expect, test, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/** Inventario agrupado: una tarjeta por tipo con stock y gestión de unidades. */
const prisma = new PrismaClient();
const stamp = Date.now().toString(36).toUpperCase().slice(-5);
const prefix = `V${stamp}`;
const itemName = `Andamio visual ${stamp}`;
let categoryId: number;

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill('admin@obragest.local');
  await page.locator('#password').fill('Admin123*');
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.beforeAll(async () => {
  const category = await prisma.categoria.create({
    data: { nombre: `Categoría visual ${stamp}`, prefijo: prefix, ultimoConsecutivo: 3 },
  });
  categoryId = category.id;
  await prisma.implemento.createMany({
    data: [1, 2, 3].map((n) => ({
      codigoSerie: `${prefix}-00${n}`,
      nombre: itemName,
      categoriaId: category.id,
      precioAlquilerDiario: 28000,
      descripcion: 'Módulo con plataforma',
    })),
  });
});

test.afterAll(async () => {
  try {
    await prisma.implemento.deleteMany({ where: { categoriaId: categoryId } });
    await prisma.categoria.deleteMany({ where: { id: categoryId } });
  } finally {
    await prisma.$disconnect();
  }
});

test('muestra una sola tarjeta por tipo y gestiona sus unidades', async ({ page }) => {
  await login(page);
  await page.goto('/inventario');
  await page.getByRole('textbox', { name: 'Buscar implementos' }).fill(itemName);

  const card = page.getByRole('article', { name: itemName, exact: true });
  await expect(card).toHaveCount(1);
  await expect(card.getByTestId('item-group-stock')).toHaveText('3 de 3 unidades');
  await expect(card).toContainText('Con stock');

  // Enviar una unidad a mantenimiento descuenta el stock disponible.
  await card.getByRole('button', { name: `Ver unidades de ${itemName}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(`Estado de ${prefix}-002`).selectOption('MANTENIMIENTO');
  await expect(page.getByText(`${prefix}-002: Mantenimiento.`).first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).first().click();

  await expect(card.getByTestId('item-group-stock')).toHaveText('2 de 3 unidades');
  await expect(card).toContainText('Mantenimiento: 1');

  // Editar el tipo cambia la tarifa de todas las unidades.
  await card.getByRole('button', { name: `Editar ${itemName}` }).click();
  await page.locator('#precio').fill('30000');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(card).toContainText('$ 30.000');

  const prices = await prisma.implemento.findMany({
    where: { categoriaId: categoryId },
    select: { precioAlquilerDiario: true },
  });
  expect(prices.map((p) => p.precioAlquilerDiario.toString())).toEqual([
    '30000',
    '30000',
    '30000',
  ]);
});
