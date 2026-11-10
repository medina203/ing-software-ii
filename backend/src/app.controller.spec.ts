import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = moduleRef.get(AppController);
  });

  it('devuelve el estado de salud con un timestamp válido', () => {
    const result = controller.health();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('inventario-alquiler-api');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
