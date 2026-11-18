import { Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { InitialAdminService } from './initial-admin.service';

function setup(existingUsers: number) {
  const prisma = {
    usuario: {
      count: jest.fn().mockResolvedValue(existingUsers),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const service = new InitialAdminService(prisma as unknown as PrismaService);
  return { prisma, service };
}

const env = {
  ADMIN_EMAIL: 'dueno@negocio.com',
  ADMIN_PASSWORD: 'ClaveSegura2026',
  ADMIN_NAME: 'Dueño',
} as NodeJS.ProcessEnv;

describe('InitialAdminService', () => {
  it('crea el administrador cuando la base de datos no tiene usuarios', async () => {
    const { prisma, service } = setup(0);
    await expect(service.ensureInitialAdmin(env)).resolves.toBe(true);

    const data = prisma.usuario.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      nombre: 'Dueño',
      email: 'dueno@negocio.com',
      rol: Rol.ADMIN,
    });
    expect(await bcrypt.compare('ClaveSegura2026', data.passwordHash)).toBe(true);
  });

  it('no toca nada si ya existen usuarios', async () => {
    const { prisma, service } = setup(3);
    await expect(service.ensureInitialAdmin(env)).resolves.toBe(false);
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it('no consulta la base de datos si no hay variables', async () => {
    const { prisma, service } = setup(0);
    await expect(service.ensureInitialAdmin({} as NodeJS.ProcessEnv)).resolves.toBe(
      false,
    );
    expect(prisma.usuario.count).not.toHaveBeenCalled();
  });
});
