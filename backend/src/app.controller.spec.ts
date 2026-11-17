import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController (health check)', () => {
  const queryRaw = jest.fn();
  let controller: AppController;

  beforeEach(async () => {
    queryRaw.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: { $queryRaw: queryRaw } }],
    }).compile();

    controller = moduleRef.get(AppController);
  });

  it('responde ok cuando PostgreSQL contesta SELECT 1', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await controller.health();

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('responde 503 cuando la base de datos no está disponible', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(controller.health()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller.health()).rejects.toMatchObject({ status: 503 });
  });
});
