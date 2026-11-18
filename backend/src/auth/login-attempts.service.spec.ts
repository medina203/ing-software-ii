import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginAttemptsService } from './login-attempts.service';

describe('LoginAttemptsService (RNF-01)', () => {
  let service: LoginAttemptsService;
  const keys = ['login:email:admin@obragest.local'];
  const t0 = 1_000_000;

  beforeEach(() => {
    service = new LoginAttemptsService();
    service.configure({ maxFailures: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 });
  });

  it('permite intentos por debajo del umbral', () => {
    for (let i = 0; i < 4; i += 1) service.registerFailure(keys, t0 + i);
    expect(() => service.assertNotLocked(keys, t0 + 10)).not.toThrow();
  });

  it('bloquea con 429 tras 5 fallos consecutivos', () => {
    for (let i = 0; i < 5; i += 1) service.registerFailure(keys, t0 + i);

    try {
      service.assertNotLocked(keys, t0 + 10);
      fail('debía lanzar 429');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('libera el bloqueo cuando vence el tiempo', () => {
    for (let i = 0; i < 5; i += 1) service.registerFailure(keys, t0 + i);
    expect(() => service.assertNotLocked(keys, t0 + 15 * 60_000 + 10)).not.toThrow();
  });

  it('un inicio de sesión exitoso reinicia el conteo', () => {
    for (let i = 0; i < 4; i += 1) service.registerFailure(keys, t0 + i);
    service.registerSuccess(keys);
    service.registerFailure(keys, t0 + 20);
    expect(() => service.assertNotLocked(keys, t0 + 30)).not.toThrow();
  });

  it('reinicia la ventana si los fallos están separados en el tiempo', () => {
    for (let i = 0; i < 4; i += 1) service.registerFailure(keys, t0 + i);
    service.registerFailure(keys, t0 + 16 * 60_000);
    expect(() => service.assertNotLocked(keys, t0 + 16 * 60_000 + 1)).not.toThrow();
  });
});
