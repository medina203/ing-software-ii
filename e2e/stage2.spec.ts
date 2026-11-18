import { expect, test, type Page } from '@playwright/test';
import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { deleteRentalsCascade } from './helpers/cleanup';

const prisma = new PrismaClient();
const stamp = Date.now();
const tempEmail = `qa-e2e-stage2-${stamp}@obragest.local`;
const initialPassword = 'Stage2Inicial123*';
const newPassword = 'Stage2Nueva123*';
const itemCode = `QA-E2E-${stamp}`;
const itemName = `Implemento QA ${stamp}`;
// Solo dígitos: el formulario arma el documento como CC-<número>.
const clientNumber = String(Date.now()).slice(-10);
const clientDocument = `CC-${clientNumber}`;
const clientName = `Cliente QA ${stamp}`;

let tempItemId: number;
let tempUserId: number;

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.beforeAll(async () => {
  await prisma.$connect();

  const category = await prisma.categoria.findFirst({
    orderBy: { id: 'asc' },
  });

  if (!category) {
    throw new Error('No hay categorías disponibles para la prueba E2E.');
  }

  const item = await prisma.implemento.create({
    data: {
      codigoSerie: itemCode,
      nombre: itemName,
      categoriaId: category.id,
      precioAlquilerDiario: 1000,
      estado: 'DISPONIBLE',
    },
  });
  tempItemId = item.id;

  const passwordHash = await bcrypt.hash(initialPassword, 10);
  const user = await prisma.usuario.create({
    data: {
      nombre: 'QA E2E Etapa 2',
      email: tempEmail,
      passwordHash,
      rol: Rol.EMPLEADO,
    },
  });
  tempUserId = user.id;
});

test.afterAll(async () => {
  if (tempItemId) {
    const details = await prisma.detalleAlquiler.findMany({
      where: { implementoId: tempItemId },
      select: { alquilerId: true },
    });
    const rentalIds = [...new Set(details.map((detail) => detail.alquilerId))];

    await deleteRentalsCascade(prisma, rentalIds);

    await prisma.implemento.deleteMany({
      where: { id: tempItemId },
    });
  }

  await prisma.cliente.deleteMany({
    where: { documentoIdentidad: clientDocument },
  });

  if (tempUserId) {
    await prisma.usuario.deleteMany({
      where: { id: tempUserId },
    });
  }

  await prisma.$disconnect();
});

test('busca cliente por cédula y nombre, y crea un alquiler', async ({ page }) => {
  await login(page, 'admin@obragest.local', 'Admin123*');
  await page.goto('/alquileres/nuevo');

  const clientSearch = page.locator('#cliente');
  await clientSearch.fill('CC-10324567');

  const byDocument = page.getByRole('option', {
    name: /CC-10324567 · Carlos Andrés Gómez Ruiz/,
  });
  await expect(byDocument).toBeVisible();
  await byDocument.click();

  await expect(page.getByLabel('Cliente seleccionado')).toHaveValue(
    'CC-10324567 · Carlos Andrés Gómez Ruiz',
  );

  await page.getByRole('button', { name: 'Cambiar' }).click();
  await clientSearch.fill('Carlos');

  const byName = page.getByRole('option', {
    name: /Carlos Andrés Gómez Ruiz/,
  });
  await expect(byName).toBeVisible();
  await byName.click();

  await expect(page.getByLabel('Cliente seleccionado')).toHaveValue(
    'CC-10324567 · Carlos Andrés Gómez Ruiz',
  );

  const itemSearch = page.getByRole('textbox', {
    name: 'Buscar implementos disponibles',
  });
  await itemSearch.fill(itemCode);

  const quantityInput = page.getByLabel(`Cantidad de ${itemName}`);
  await expect(quantityInput).toBeVisible();
  await quantityInput.fill('1');
  await expect(quantityInput).toHaveValue('1');

  // El cliente demo tiene la factura FAC-DEMO-0001 pendiente (Etapa 4): el ADMIN
  // registra el motivo de la excepción en el mismo flujo.
  await expect(page.getByTestId('cartera-alert')).toBeVisible();
  await page.getByRole('button', { name: 'Autorizar y confirmar' }).click();
  await page.locator('#cartera-motivo').fill('Cliente demo con pago comprometido');
  await page.getByRole('button', { name: 'Autorizar y registrar' }).click();

  await expect(page).toHaveURL(/\/alquileres\/\d+$/);
  await expect(page.getByText(itemCode).first()).toBeVisible();
  await expect(page.getByText('Carlos Andrés Gómez Ruiz').first()).toBeVisible();
});

test('busca clientes desde el servidor en la página de clientes', async ({ page }) => {
  await login(page, 'admin@obragest.local', 'Admin123*');
  await page.goto('/clientes');

  const search = page.getByRole('textbox', { name: 'Buscar clientes' });
  await search.fill('NIT-900123456-7');

  await expect(page.getByText('Constructora El Progreso S.A.S.')).toBeVisible();
  await expect(page.getByText('Carlos Andrés Gómez Ruiz')).toHaveCount(0);
});

test('registra, edita y elimina un cliente de regresión', async ({ page }) => {
  await login(page, 'admin@obragest.local', 'Admin123*');
  await page.goto('/clientes');

  await page.getByRole('button', { name: 'Nuevo cliente' }).click();
  await page.locator('#docTipo').selectOption('CC');
  await page.locator('#documento').fill(clientNumber);
  await page.locator('#telefono').fill('3001234567');
  await page.locator('#nombres').fill(clientName);
  await page.locator('#apellidos').fill('Regresión E2E');
  await page.getByRole('button', { name: 'Registrar cliente' }).click();

  await expect(page.getByText('Cliente registrado correctamente.').first()).toBeVisible();

  const search = page.getByRole('textbox', { name: 'Buscar clientes' });
  await search.fill(clientDocument);
  await expect(page.getByText('Carlos Andrés Gómez Ruiz')).toHaveCount(0);
  await expect(page.getByText(clientName)).toBeVisible();

  await page.getByRole('button', { name: 'Editar cliente' }).click();
  await page.locator('#nombres').fill(`${clientName} Editado`);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(
    page.getByText('Cliente actualizado correctamente.').first(),
  ).toBeVisible();
  await expect(page.getByText(`${clientName} Editado`)).toBeVisible();

  await page.getByRole('button', { name: 'Eliminar cliente' }).click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();

  await expect(page.getByText('Cliente eliminado correctamente.').first()).toBeVisible();
  await expect(page.getByText(`${clientName} Editado`)).toHaveCount(0);
});

test('pagina el inventario sin truncar el total', async ({ page }) => {
  // Diez tipos distintos garantizan más de una página (9 tipos por página).
  const stampPag = Date.now().toString(36).toUpperCase().slice(-5);
  const category = await prisma.categoria.create({
    data: {
      nombre: `Categoría paginación E2E ${stampPag}`,
      prefijo: `P${stampPag}`,
      ultimoConsecutivo: 10,
    },
  });
  try {
    await prisma.implemento.createMany({
      data: Array.from({ length: 10 }, (_, index) => ({
        codigoSerie: `P${stampPag}-${String(index + 1).padStart(3, '0')}`,
        nombre: `Tipo paginación ${stampPag} ${index}`,
        categoriaId: category.id,
        precioAlquilerDiario: 1000,
      })),
    });

    await login(page, 'admin@obragest.local', 'Admin123*');
    await page.goto('/inventario');

    await expect(page.getByText(/Página 1 de \d+ · \d+ implementos/)).toBeVisible();

    const nextButton = page.getByRole('button', { name: 'Siguiente' });
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    await expect(page.getByText(/Página 2 de \d+ · \d+ implementos/)).toBeVisible();

    await page.getByRole('button', { name: 'Anterior' }).click();
    await expect(page.getByText(/Página 1 de \d+ · \d+ implementos/)).toBeVisible();
  } finally {
    await prisma.implemento.deleteMany({ where: { categoriaId: category.id } });
    await prisma.categoria.delete({ where: { id: category.id } });
  }
});

test('cambia la contraseña y permite volver a iniciar sesión', async ({ page }) => {
  await login(page, tempEmail, initialPassword);
  await page.goto('/perfil');

  await page.locator('#currentPassword').fill(initialPassword);
  await page.locator('#newPassword').fill(newPassword);
  await page.locator('#confirmPassword').fill(newPassword);
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();

  await expect(
    page.getByText('Contraseña actualizada correctamente.').first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.locator('#email').fill(tempEmail);
  await page.locator('#password').fill(newPassword);
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();

  await expect(page).toHaveURL(/\/inventario$/);
});
