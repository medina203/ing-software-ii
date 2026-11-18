import { expect, test, type Page } from '@playwright/test';
import { EstadoImplemento, PrismaClient } from '@prisma/client';
import { deleteRentalsCascade } from './helpers/cleanup';

/**
 * Etapa 4 — flujo de cartera en la interfaz (RF-15, RF-16, RF-17, RF-21).
 */
const prisma = new PrismaClient();
const stamp = Date.now();
const prefix = `C${stamp.toString(36).toUpperCase().slice(-5)}`;
const itemName = `Compresor E2E ${stamp}`;
const clientDocument = `E2E-ST4-${stamp}`;
let categoryId: number;
let clientId: number;
const itemIds: number[] = [];

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function startRental(page: Page, quantity: number) {
  await page.goto('/alquileres/nuevo');
  await page.locator('#cliente').fill(clientDocument);
  await page.getByRole('option', { name: new RegExp(clientDocument) }).click();
  await page
    .getByRole('textbox', { name: 'Buscar implementos disponibles' })
    .fill(itemName);
  await page.getByLabel(`Cantidad de ${itemName}`).fill(String(quantity));
}

test.beforeAll(async () => {
  await prisma.$connect();
  const category = await prisma.categoria.create({
    data: {
      nombre: `Categoría cartera E2E ${stamp}`,
      prefijo: prefix,
      ultimoConsecutivo: 3,
    },
  });
  categoryId = category.id;
  for (let index = 1; index <= 3; index += 1) {
    const item = await prisma.implemento.create({
      data: {
        codigoSerie: `${prefix}-00${index}`,
        nombre: itemName,
        categoriaId: category.id,
        precioAlquilerDiario: 20000,
        estado: EstadoImplemento.DISPONIBLE,
      },
    });
    itemIds.push(item.id);
  }
  const client = await prisma.cliente.create({
    data: {
      documentoIdentidad: clientDocument,
      nombres: 'Cliente',
      apellidos: 'Cartera E2E',
      telefono: '3000000000',
    },
  });
  clientId = client.id;
});

test.afterAll(async () => {
  try {
    const rentals = await prisma.alquiler.findMany({
      where: { clienteId: clientId },
      select: { id: true },
    });
    await deleteRentalsCascade(
      prisma,
      rentals.map((rental) => rental.id),
    );
    await prisma.implemento.deleteMany({ where: { id: { in: itemIds } } });
    await prisma.categoria.deleteMany({ where: { id: categoryId } });
    await prisma.cliente.deleteMany({ where: { id: clientId } });
  } finally {
    await prisma.$disconnect();
  }
});

test.describe.configure({ mode: 'serial' });

test('primer alquiler sin cartera y factura visible en el detalle', async ({ page }) => {
  await login(page, 'empleado@obragest.local', 'Empleado123*');
  await startRental(page, 1);

  await expect(page.getByText('El cliente está al día con su cartera.')).toBeVisible();
  await expect(page.getByTestId('estimated-total')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar alquiler' }).click();

  await expect(page).toHaveURL(/\/alquileres\/\d+$/);
  const invoice = page.getByTestId('rental-invoice');
  await expect(invoice).toBeVisible();
  await expect(invoice).toContainText('FAC-');
  await expect(invoice).toContainText('Pendiente');
});

test('EMPLEADO con cartera pendiente necesita credenciales de ADMIN', async ({
  page,
}) => {
  await login(page, 'empleado@obragest.local', 'Empleado123*');
  await startRental(page, 1);

  await expect(page.getByTestId('cartera-alert')).toContainText('saldo pendiente');
  await page.getByRole('button', { name: 'Autorizar y confirmar' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('#cartera-motivo').fill('Pago acordado para el viernes');
  await dialog.locator('#cartera-admin-email').fill('admin@obragest.local');
  await dialog.locator('#cartera-admin-password').fill('incorrecta');
  await dialog.getByRole('button', { name: 'Autorizar y registrar' }).click();

  // Credenciales inválidas: el error se muestra en el modal y la sesión sigue activa.
  await expect(
    dialog.getByText('Las credenciales del administrador no son válidas.'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/alquileres\/nuevo$/);

  await dialog.locator('#cartera-admin-password').fill('Admin123*');
  await dialog.getByRole('button', { name: 'Autorizar y registrar' }).click();
  await expect(page).toHaveURL(/\/alquileres\/\d+$/);

  const rentalId = Number(page.url().split('/').pop());
  const audit = await prisma.autorizacionCartera.findUnique({
    where: { alquilerId: rentalId },
  });
  expect(audit?.motivo).toBe('Pago acordado para el viernes');
});

test('la devolución muestra la alerta de cartera y se registra', async ({ page }) => {
  await login(page, 'empleado@obragest.local', 'Empleado123*');
  const rental = await prisma.alquiler.findFirstOrThrow({
    where: { clienteId: clientId, devolucion: null },
    orderBy: { id: 'asc' },
  });

  await page.goto(`/devoluciones/nueva/${rental.id}`);
  await expect(page.getByTestId('return-cartera-alert')).toContainText(
    'Cliente con cartera pendiente',
  );
  await page
    .getByRole('button', { name: /Confirmar devolución|Registrar devolución/ })
    .click();

  await expect(page).toHaveURL(new RegExp(`/alquileres/${rental.id}$`));
  const devolucion = await prisma.devolucion.findUniqueOrThrow({
    where: { alquilerId: rental.id },
  });
  expect(devolucion.alertaCartera).toBe(true);
});
