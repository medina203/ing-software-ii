import {
  EstadoAlquiler,
  EstadoEntrega,
  EstadoImplemento,
  PrismaClient,
  Rol,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function dateAtDays(offset: number): Date {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

async function main() {
  console.log('🌱 Iniciando datos de prueba...');

  const [adminPassword, employeePassword] = await Promise.all([
    bcrypt.hash('Admin123*', 10),
    bcrypt.hash('Empleado123*', 10),
  ]);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@obragest.local' },
    update: {
      nombre: 'Daniel Administrador',
      passwordHash: adminPassword,
      rol: Rol.ADMIN,
      activo: true,
    },
    create: {
      nombre: 'Daniel Administrador',
      email: 'admin@obragest.local',
      passwordHash: adminPassword,
      rol: Rol.ADMIN,
    },
  });

  const empleado = await prisma.usuario.upsert({
    where: { email: 'empleado@obragest.local' },
    update: {
      nombre: 'Eduardo Empleado',
      passwordHash: employeePassword,
      rol: Rol.EMPLEADO,
      activo: true,
    },
    create: {
      nombre: 'Eduardo Empleado',
      email: 'empleado@obragest.local',
      passwordHash: employeePassword,
      rol: Rol.EMPLEADO,
    },
  });

  const categoriesData = [
    {
      nombre: 'Herramientas eléctricas',
      descripcion: 'Taladros, esmeriladoras y herramientas de corte.',
    },
    {
      nombre: 'Maquinaria ligera',
      descripcion: 'Equipos para mezcla, compactación y generación de energía.',
    },
    {
      nombre: 'Andamios y acceso',
      descripcion: 'Estructuras y equipos para trabajo en altura.',
    },
    {
      nombre: 'Equipos de medición',
      descripcion: 'Instrumentos de precisión para obra y topografía.',
    },
    {
      nombre: 'Seguridad industrial',
      descripcion: 'Elementos de protección personal para obra.',
    },
  ];

  const categories: Record<string, number> = {};
  for (const category of categoriesData) {
    const record = await prisma.categoria.upsert({
      where: { nombre: category.nombre },
      update: { descripcion: category.descripcion },
      create: category,
    });
    categories[category.nombre] = record.id;
  }

  const itemsData = [
    {
      codigoSerie: 'HERR-001',
      nombre: 'Taladro percutor Bosch 850 W',
      categoria: 'Herramientas eléctricas',
      descripcion: 'Taladro percutor con maletín, brocas y empuñadura auxiliar.',
      precio: '45000.00',
      estado: EstadoImplemento.DISPONIBLE,
    },
    {
      codigoSerie: 'HERR-002',
      nombre: 'Esmeriladora angular 4½"',
      categoria: 'Herramientas eléctricas',
      descripcion: 'Esmeriladora de 900 W con disco de corte incluido.',
      precio: '32000.00',
      estado: EstadoImplemento.DISPONIBLE,
    },
    {
      codigoSerie: 'HERR-003',
      nombre: 'Martillo demoledor 1500 W',
      categoria: 'Herramientas eléctricas',
      descripcion: 'Martillo demoledor con punta y cincel.',
      precio: '65000.00',
      estado: EstadoImplemento.DISPONIBLE,
    },
    {
      codigoSerie: 'MAQ-001',
      nombre: 'Mezcladora de concreto 1 bulto',
      categoria: 'Maquinaria ligera',
      descripcion: 'Mezcladora eléctrica de 1 bulto con tambor reforzado.',
      precio: '85000.00',
      estado: EstadoImplemento.DISPONIBLE,
    },
    {
      codigoSerie: 'MAQ-002',
      nombre: 'Compactadora tipo saltarín',
      categoria: 'Maquinaria ligera',
      descripcion: 'Compactadora a gasolina para suelos y afirmados.',
      precio: '95000.00',
      estado: EstadoImplemento.DISPONIBLE,
    },
    {
      codigoSerie: 'MAQ-003',
      nombre: 'Generador eléctrico 3 kW',
      categoria: 'Maquinaria ligera',
      descripcion: 'Generador a gasolina con arranque manual.',
      precio: '120000.00',
      estado: EstadoImplemento.DISPONIBLE,
    },
    {
      codigoSerie: 'AND-001',
      nombre: 'Andamio certificado 2 m',
      categoria: 'Andamios y acceso',
      descripcion: 'Módulo de andamio con plataforma y barandas certificadas.',
      precio: '28000.00',
      estado: EstadoImplemento.DISPONIBLE,
    },
    {
      codigoSerie: 'AND-002',
      nombre: 'Escalera telescópica 6 m',
      categoria: 'Andamios y acceso',
      descripcion: 'Escalera de aluminio extensible con sistema de bloqueo.',
      precio: '22000.00',
      estado: EstadoImplemento.DISPONIBLE,
    },
    {
      codigoSerie: 'MED-001',
      nombre: 'Nivel láser autonivelante',
      categoria: 'Equipos de medición',
      descripcion: 'Nivel láser verde con trípode y estuche de transporte.',
      precio: '38000.00',
      estado: EstadoImplemento.DISPONIBLE,
    },
    {
      codigoSerie: 'MED-002',
      nombre: 'Estación total Topcon',
      categoria: 'Equipos de medición',
      descripcion: 'Estación total con maletín, trípode y prismas.',
      precio: '150000.00',
      estado: EstadoImplemento.MANTENIMIENTO,
    },
    {
      codigoSerie: 'SEG-001',
      nombre: 'Arnés de seguridad full body',
      categoria: 'Seguridad industrial',
      descripcion: 'Arnés con amortiguador y línea de vida doble.',
      precio: '15000.00',
      estado: EstadoImplemento.FUERA_DE_SERVICIO,
    },
    {
      codigoSerie: 'SEG-002',
      nombre: 'Kit casco y chaleco reflectivo',
      categoria: 'Seguridad industrial',
      descripcion: 'Casco de seguridad y chaleco de alta visibilidad.',
      precio: '8000.00',
      estado: EstadoImplemento.DISPONIBLE,
    },
  ];

  const items: Record<string, { id: number; precio: string }> = {};
  for (const item of itemsData) {
    const record = await prisma.implemento.upsert({
      where: { codigoSerie: item.codigoSerie },
      update: {
        nombre: item.nombre,
        categoriaId: categories[item.categoria],
        descripcion: item.descripcion,
        precioAlquilerDiario: item.precio,
      },
      create: {
        codigoSerie: item.codigoSerie,
        nombre: item.nombre,
        categoriaId: categories[item.categoria],
        descripcion: item.descripcion,
        precioAlquilerDiario: item.precio,
        estado: item.estado,
      },
    });
    items[item.codigoSerie] = { id: record.id, precio: item.precio };
  }

  const client = await prisma.cliente.upsert({
    where: { documentoIdentidad: 'CC-10324567' },
    update: {
      nombres: 'Carlos Andrés',
      apellidos: 'Gómez Ruiz',
      telefono: '3105551234',
      correo: 'carlos.gomez@example.com',
      direccion: 'Calle 45 # 12-30, Bogotá',
    },
    create: {
      documentoIdentidad: 'CC-10324567',
      nombres: 'Carlos Andrés',
      apellidos: 'Gómez Ruiz',
      telefono: '3105551234',
      correo: 'carlos.gomez@example.com',
      direccion: 'Calle 45 # 12-30, Bogotá',
    },
  });

  const secondClient = await prisma.cliente.upsert({
    where: { documentoIdentidad: 'NIT-900123456-7' },
    update: {
      nombres: 'Constructora',
      apellidos: 'El Progreso S.A.S.',
      telefono: '6015558899',
      correo: 'compras@elprogreso.example.com',
      direccion: 'Carrera 30 # 50-22, Bogotá',
    },
    create: {
      documentoIdentidad: 'NIT-900123456-7',
      nombres: 'Constructora',
      apellidos: 'El Progreso S.A.S.',
      telefono: '6015558899',
      correo: 'compras@elprogreso.example.com',
      direccion: 'Carrera 30 # 50-22, Bogotá',
    },
  });

  await prisma.cliente.upsert({
    where: { documentoIdentidad: 'CE-7845123' },
    update: {
      nombres: 'María Fernanda',
      apellidos: 'López Rojas',
      telefono: '3204447788',
      correo: 'maria.lopez@example.com',
      direccion: 'Avenida 68 # 24-10, Bogotá',
    },
    create: {
      documentoIdentidad: 'CE-7845123',
      nombres: 'María Fernanda',
      apellidos: 'López Rojas',
      telefono: '3204447788',
      correo: 'maria.lopez@example.com',
      direccion: 'Avenida 68 # 24-10, Bogotá',
    },
  });

  // Los alquileres demo solo se crean en una base de datos vacía, para no
  // alterar las operaciones reales si el seed se vuelve a ejecutar.
  const rentalCount = await prisma.alquiler.count();
  if (rentalCount === 0) {
    await prisma.alquiler.create({
      data: {
        codigoAlquiler: 'ALQ-DEMO-0001',
        clienteId: client.id,
        usuarioId: empleado.id,
        fechaAlquiler: dateAtDays(-2),
        fechaPactadaDevolucion: dateAtDays(5),
        estado: EstadoAlquiler.ACTIVO,
        observaciones: 'Obra en zona norte. Entrega en bodega del cliente.',
        detalles: {
          create: [
            {
              implementoId: items['HERR-001'].id,
              precioUnitario: items['HERR-001'].precio,
            },
            {
              implementoId: items['HERR-003'].id,
              precioUnitario: items['HERR-003'].precio,
            },
          ],
        },
      },
    });

    await prisma.alquiler.create({
      data: {
        codigoAlquiler: 'ALQ-DEMO-0002',
        clienteId: secondClient.id,
        usuarioId: empleado.id,
        fechaAlquiler: dateAtDays(-10),
        fechaPactadaDevolucion: dateAtDays(-3),
        estado: EstadoAlquiler.VENCIDO,
        observaciones: 'Pendiente confirmar avance de obra para devolución.',
        detalles: {
          create: [
            {
              implementoId: items['MAQ-001'].id,
              precioUnitario: items['MAQ-001'].precio,
            },
          ],
        },
      },
    });

    const finishedRental = await prisma.alquiler.create({
      data: {
        codigoAlquiler: 'ALQ-DEMO-0003',
        clienteId: client.id,
        usuarioId: empleado.id,
        fechaAlquiler: dateAtDays(-20),
        fechaPactadaDevolucion: dateAtDays(-12),
        estado: EstadoAlquiler.FINALIZADO,
        observaciones: 'Alquiler de andamio para fachada.',
        detalles: {
          create: [
            {
              implementoId: items['AND-001'].id,
              precioUnitario: items['AND-001'].precio,
            },
          ],
        },
      },
    });

    await prisma.devolucion.create({
      data: {
        alquilerId: finishedRental.id,
        usuarioId: empleado.id,
        fechaDevolucion: dateAtDays(-11),
        estadoEntregaImplementos: 'Sin novedades',
        observaciones: 'Implemento recibido completo y en buen estado.',
        detalles: {
          create: [
            {
              implementoId: items['AND-001'].id,
              estadoFinal: EstadoEntrega.DISPONIBLE,
              observaciones: 'Sin golpes ni faltantes.',
            },
          ],
        },
      },
    });

    await prisma.implemento.updateMany({
      where: {
        id: {
          in: [
            items['HERR-001'].id,
            items['HERR-003'].id,
            items['MAQ-001'].id,
          ],
        },
      },
      data: { estado: EstadoImplemento.ALQUILADO },
    });
  }

  console.log('✅ Seed completado.');
  console.log(`   Administrador: ${admin.email} / Admin123*`);
  console.log(`   Empleado:      ${empleado.email} / Empleado123*`);
  console.log('   Categorías: 5 | Implementos: 12 | Clientes: 3');
  console.log('   Alquileres demo: activo, vencido y finalizado.');
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando el seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
