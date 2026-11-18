import { expect, test, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { deflateSync } from 'zlib';

/**
 * Etapa 6: campos numéricos, ver factura desde cartera, carrusel del panel,
 * apariencia personalizable e imágenes de implementos.
 */
const prisma = new PrismaClient();
const stamp = Date.now().toString(36).toUpperCase().slice(-5);
const itemName = `Mezcladora imagen ${stamp}`;
let categoryId: number;

function tinyPng(): Buffer {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buffer: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buffer) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2, 0);
  header.writeUInt32BE(2, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.from([0, 245, 179, 1, 245, 179, 1]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat([row, row]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill('admin@obragest.local');
  await page.locator('#password').fill('Admin123*');
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.beforeAll(async () => {
  const category = await prisma.categoria.create({
    data: {
      nombre: `Categoría imágenes ${stamp}`,
      prefijo: `I${stamp}`,
      ultimoConsecutivo: 1,
    },
  });
  categoryId = category.id;
  await prisma.implemento.create({
    data: {
      codigoSerie: `I${stamp}-001`,
      nombre: itemName,
      categoriaId: categoryId,
      precioAlquilerDiario: 30000,
    },
  });
});

test.afterAll(async () => {
  try {
    await prisma.implemento.deleteMany({ where: { categoriaId: categoryId } });
    await prisma.categoria.deleteMany({ where: { id: categoryId } });
    await prisma.configuracion.deleteMany({});
  } finally {
    await prisma.$disconnect();
  }
});

test.describe.configure({ mode: 'serial' });

test('los campos de identificación y teléfono no aceptan letras y limitan dígitos', async ({
  page,
}) => {
  await login(page);
  await page.goto('/clientes');
  await page.getByRole('button', { name: 'Nuevo cliente' }).click();

  await page.locator('#documento').pressSequentially('ab12cd345678901');
  await expect(page.locator('#documento')).toHaveValue('1234567890');

  await page.locator('#telefono').pressSequentially('300-ABC-1234567');
  await expect(page.locator('#telefono')).toHaveValue('3001234567');

  await page.locator('#docTipo').selectOption('NIT');
  await expect(page.locator('#documento')).toHaveValue('123456789');
  await expect(page.getByLabel('Dígito de verificación')).toBeVisible();
});

test('desde cartera se abre la factura en el detalle del alquiler', async ({ page }) => {
  await login(page);
  await page.goto('/cartera');
  await page.getByRole('link', { name: 'Ver factura FAC-DEMO-0001' }).click();

  await expect(page).toHaveURL(/\/alquileres\/\d+#factura$/);
  const invoice = page.getByTestId('rental-invoice');
  await expect(invoice).toBeVisible();
  await expect(invoice).toContainText('FAC-DEMO-0001');
  await expect(invoice).toBeInViewport();
});

test('el panel muestra un carrusel navegable con cuatro artículos', async ({ page }) => {
  await login(page);
  const carousel = page.getByRole('region', { name: 'Artículos destacados' });
  await expect(carousel).toBeVisible();
  await expect(carousel.getByTestId('carousel-slide')).toHaveCount(4);

  await carousel.getByRole('button', { name: 'Pausar carrusel' }).click();
  const active = carousel.locator('[data-testid="carousel-slide"][data-active="true"]');
  await expect(active).toHaveAttribute('aria-label', /^1 de 4/);
  await carousel.getByRole('button', { name: 'Artículo siguiente' }).click();
  await expect(active).toHaveAttribute('aria-label', /^2 de 4/);
  await carousel.getByRole('tab', { name: /Ir al artículo 4/ }).click();
  await expect(active).toHaveAttribute('aria-label', /^4 de 4/);
});

test('el ADMIN activa el modo oscuro y cambia color y tamaño de letra', async ({
  page,
}) => {
  await login(page);
  await page.goto('/apariencia');

  await page.getByRole('radio', { name: 'Oscuro' }).click();
  await page.getByRole('radio', { name: 'Verde' }).click();
  await page.getByRole('radio', { name: /Grande/ }).click();
  const html = page.locator('html');
  await expect(html).toHaveClass(/dark/);
  await expect(html).toHaveAttribute('data-color', 'verde');
  await expect(html).toHaveAttribute('data-font', 'grande');

  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Apariencia guardada').first()).toBeVisible();

  // Se conserva al recargar y también en el login.
  await page.reload();
  await expect(html).toHaveClass(/dark/);
  const fontSize = await html.evaluate((element) => getComputedStyle(element).fontSize);
  expect(fontSize).toBe('18px');

  await page.getByRole('radio', { name: 'Claro' }).click();
  await page.getByRole('radio', { name: 'Ámbar' }).click();
  await page.getByRole('radio', { name: /Normal/ }).click();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(html).not.toHaveClass(/dark/);
});

test('el ADMIN sube una imagen para un implemento y puede volver a la ilustración', async ({
  page,
}) => {
  await login(page);
  await page.goto('/inventario');
  await page.getByRole('textbox', { name: 'Buscar implementos' }).fill(itemName);
  const card = page.getByRole('article', { name: itemName, exact: true });

  // Sin imagen subida se ve la ilustración del tipo.
  await expect(card.getByRole('img', { name: itemName })).toHaveAttribute(
    'src',
    '/ilustraciones/mezcladora.svg',
  );

  await card.getByRole('button', { name: `Cambiar imagen de ${itemName}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: tinyPng(),
  });
  await dialog.getByRole('button', { name: 'Guardar imagen' }).click();
  await expect(page.getByText('Imagen actualizada.').first()).toBeVisible();
  await expect(card.getByRole('img', { name: itemName })).toHaveAttribute(
    'src',
    /\/uploads\/items\/[\w-]+\.(webp|png|jpg)$/,
  );

  await card.getByRole('button', { name: `Cambiar imagen de ${itemName}` }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Usar ilustración' })
    .click();
  await expect(card.getByRole('img', { name: itemName })).toHaveAttribute(
    'src',
    '/ilustraciones/mezcladora.svg',
  );
});
