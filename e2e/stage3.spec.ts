import { expect, test, type Page } from '@playwright/test';
import { EstadoImplemento, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const stamp = Date.now();
const createdCategoryNames: string[] = [];

function uniquePrefix(letter: string): string {
  return `${letter}${stamp.toString(36).toUpperCase().slice(-4)}`;
}

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill('admin@obragest.local');
  await page.locator('#password').fill('Admin123*');
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function selectClient(page: Page) {
  const clientSearch = page.locator('#cliente');
  await clientSearch.fill('CC-10324567');
  const option = page.getByRole('option', {
    name: /CC-10324567 · Carlos Andrés Gómez Ruiz/,
  });
  await expect(option).toBeVisible();
  await option.click();
}

async function createCategoryWithItems(options: {
  name: string;
  prefix: string;
  itemName: string;
  count: number;
  price?: number;
  maintenanceCount?: number;
}) {
  const category = await prisma.categoria.create({
    data: {
      nombre: options.name,
      prefijo: options.prefix,
      ultimoConsecutivo: options.count,
      descripcion: 'Categoría temporal de la prueba E2E de Etapa 3.',
    },
  });
  createdCategoryNames.push(options.name);

  const items = await Promise.all(
    Array.from({ length: options.count }, (_, index) =>
      prisma.implemento.create({
        data: {
          codigoSerie: `${options.prefix}-${String(index + 1).padStart(3, '0')}`,
          nombre: options.itemName,
          categoriaId: category.id,
          descripcion: 'Implemento temporal de la prueba E2E de Etapa 3.',
          precioAlquilerDiario: options.price ?? 28000,
          estado:
            index < (options.maintenanceCount ?? 0)
              ? EstadoImplemento.MANTENIMIENTO
              : EstadoImplemento.DISPONIBLE,
        },
      }),
    ),
  );

  return { category, items };
}

test.beforeAll(async () => {
  await prisma.$connect();
});

test.afterAll(async () => {
  try {
    for (const name of createdCategoryNames) {
      const category = await prisma.categoria.findUnique({
        where: { nombre: name },
        select: { id: true },
      });

      if (!category) continue;

      const items = await prisma.implemento.findMany({
        where: { categoriaId: category.id },
        select: { id: true },
      });
      const itemIds = items.map((item) => item.id);

      if (itemIds.length > 0) {
        const details = await prisma.detalleAlquiler.findMany({
          where: { implementoId: { in: itemIds } },
          select: { alquilerId: true },
        });
        const rentalIds = [...new Set(details.map((detail) => detail.alquilerId))];

        if (rentalIds.length > 0) {
          await prisma.alquiler.deleteMany({
            where: { id: { in: rentalIds } },
          });
        }

        await prisma.implemento.deleteMany({
          where: { id: { in: itemIds } },
        });
      }

      await prisma.categoria.delete({ where: { id: category.id } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

test('crea categoría con prefijo, implemento y serial automático de solo lectura', async ({
  page,
}) => {
  const prefix = uniquePrefix('Q');
  const categoryName = `Categoría E2E ${stamp}`;
  const itemName = `Taladro E2E ${stamp}`;
  createdCategoryNames.push(categoryName);

  await login(page);
  await page.goto('/categorias');

  await page.getByRole('button', { name: 'Nueva categoría' }).click();
  await page.locator('#nombreCategoria').fill(categoryName);
  await page.locator('#prefijoCategoria').fill(prefix);
  await page.getByRole('button', { name: 'Crear categoría' }).click();

  await expect(page.getByText('Categoría creada correctamente.').first()).toBeVisible();
  await expect(page.getByText(`Prefijo ${prefix}`)).toBeVisible();
  await expect(page.getByText(`Próximo serial ${prefix}-001`)).toBeVisible();

  await page.goto('/inventario');
  await page.getByRole('button', { name: 'Nuevo implemento' }).click();
  await page.locator('#nombre').fill(itemName);
  await page.locator('#categoriaId').selectOption({ label: categoryName });
  await page.locator('#precio').fill('45000');

  const serialInput = page.locator('#codigoSerie');
  await expect(serialInput).toHaveValue(`${prefix}-001`);
  await expect(serialInput).not.toBeEditable();

  await page.getByRole('button', { name: 'Registrar implemento' }).click();
  await expect(
    page.getByText('Implemento registrado correctamente.').first(),
  ).toBeVisible();

  const search = page.getByRole('textbox', { name: 'Buscar implementos' });
  await search.fill(itemName);
  await expect(page.getByText(`${prefix}-001`)).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo implemento' }).click();
  await page.locator('#nombre').fill(`${itemName} 2`);
  await page.locator('#categoriaId').selectOption({ label: categoryName });
  await page.locator('#precio').fill('45000');

  await expect(page.locator('#codigoSerie')).toHaveValue(`${prefix}-002`);
  await page.getByRole('button', { name: 'Registrar implemento' }).click();
  await expect(
    page.getByText('Implemento registrado correctamente.').first(),
  ).toBeVisible();

  await search.fill(`${itemName} 2`);
  await expect(page.getByText(`${prefix}-002`)).toBeVisible();
});

test('alquila 5 andamios y descuenta las 5 unidades correctas', async ({ page }) => {
  const prefix = uniquePrefix('R');
  const categoryName = `Categoría alquiler E2E ${stamp}`;
  const itemName = `Andamio E2E ${stamp}`;
  const { items } = await createCategoryWithItems({
    name: categoryName,
    prefix,
    itemName,
    count: 5,
  });

  await login(page);
  await page.goto('/alquileres/nuevo');
  await selectClient(page);

  const itemSearch = page.getByRole('textbox', {
    name: 'Buscar implementos disponibles',
  });
  await itemSearch.fill(itemName);

  const quantityInput = page.getByLabel(`Cantidad de ${itemName}`);
  await expect(quantityInput).toBeVisible();
  await expect(page.getByText('5 unidades disponibles')).toBeVisible();
  await quantityInput.fill('5');

  await expect(page.getByText(/Tarifa diaria · 5 unidades/)).toBeVisible();

  const summary = page.locator('aside');
  for (const item of items) {
    await expect(summary.getByText(item.codigoSerie)).toBeVisible();
  }

  await page.getByRole('button', { name: 'Confirmar alquiler' }).click();
  await expect(page).toHaveURL(/\/alquileres\/\d+$/);

  for (const item of items) {
    await expect(page.getByText(item.codigoSerie).first()).toBeVisible();
  }

  const rentedItems = await prisma.implemento.findMany({
    where: { id: { in: items.map((item) => item.id) } },
    select: { estado: true },
  });
  expect(rentedItems.every((item) => item.estado === EstadoImplemento.ALQUILADO)).toBe(
    true,
  );

  const detailCount = await prisma.detalleAlquiler.count({
    where: { implementoId: { in: items.map((item) => item.id) } },
  });
  expect(detailCount).toBe(5);
});

test('rechaza el alquiler cuando una unidad deja de estar disponible', async ({
  page,
}) => {
  const prefix = uniquePrefix('S');
  const categoryName = `Categoría no disponible E2E ${stamp}`;
  const itemName = `Escalera E2E ${stamp}`;
  const { items } = await createCategoryWithItems({
    name: categoryName,
    prefix,
    itemName,
    count: 5,
  });

  await login(page);
  await page.goto('/alquileres/nuevo');
  await selectClient(page);

  const itemSearch = page.getByRole('textbox', {
    name: 'Buscar implementos disponibles',
  });
  await itemSearch.fill(itemName);
  await page.getByLabel(`Cantidad de ${itemName}`).fill('5');

  await prisma.implemento.update({
    where: { id: items[0].id },
    data: { estado: EstadoImplemento.ALQUILADO },
  });

  await page.getByRole('button', { name: 'Confirmar alquiler' }).click();

  await expect(
    page.getByText(/Solo se pueden alquilar implementos disponibles/),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/alquileres\/nuevo$/);

  const details = await prisma.detalleAlquiler.count({
    where: { implementoId: { in: items.map((item) => item.id) } },
  });
  expect(details).toBe(0);

  const remaining = await prisma.implemento.findMany({
    where: { id: { in: items.slice(1).map((item) => item.id) } },
    select: { estado: true },
  });
  expect(remaining.every((item) => item.estado === EstadoImplemento.DISPONIBLE)).toBe(
    true,
  );
});

test('muestra la disponibilidad real cuando la cantidad solicitada la supera', async ({
  page,
}) => {
  const prefix = uniquePrefix('T');
  const categoryName = `Categoría cantidad E2E ${stamp}`;
  const itemName = `Andamio limitado E2E ${stamp}`;
  await createCategoryWithItems({
    name: categoryName,
    prefix,
    itemName,
    count: 5,
    maintenanceCount: 2,
  });

  await login(page);
  await page.goto('/alquileres/nuevo');
  await selectClient(page);

  const itemSearch = page.getByRole('textbox', {
    name: 'Buscar implementos disponibles',
  });
  await itemSearch.fill(itemName);

  await expect(page.getByText('3 unidades disponibles')).toBeVisible();
  const quantityInput = page.getByLabel(`Cantidad de ${itemName}`);
  await quantityInput.fill('5');

  await expect(
    page.getByText('Solo hay 3 unidades disponibles de este tipo.'),
  ).toBeVisible();
  await expect(quantityInput).toHaveValue('3');
});
