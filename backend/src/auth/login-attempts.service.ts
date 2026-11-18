import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface AttemptState {
  failures: number;
  windowStart: number;
  lockedUntil: number;
}

export interface LoginAttemptsOptions {
  maxFailures: number;
  windowMs: number;
  lockMs: number;
}

const DEFAULT_OPTIONS: LoginAttemptsOptions = {
  maxFailures: Number(process.env.LOGIN_MAX_FAILURES ?? 5),
  windowMs: Number(process.env.LOGIN_WINDOW_MINUTES ?? 15) * 60_000,
  lockMs: Number(process.env.LOGIN_LOCK_MINUTES ?? 15) * 60_000,
};

/**
 * Bloqueo temporal ante intentos fallidos de autenticación (RNF-01, H-04).
 * Tras `maxFailures` fallos dentro de la ventana, la clave queda bloqueada y
 * responde 429. Se aplica al login y a la validación de credenciales de ADMIN
 * en la autorización de cartera. El estado vive en memoria del proceso; con
 * varias instancias debe moverse a un almacén compartido (p. ej. Redis).
 */
@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, AttemptState>();
  private options: LoginAttemptsOptions = { ...DEFAULT_OPTIONS };

  configure(options: Partial<LoginAttemptsOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /** Lanza 429 si alguna de las claves está bloqueada. */
  assertNotLocked(keys: string[], now = Date.now()): void {
    for (const key of keys) {
      const state = this.attempts.get(key);
      if (state && state.lockedUntil > now) {
        const minutes = Math.max(1, Math.ceil((state.lockedUntil - now) / 60_000));
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            code: 'TOO_MANY_ATTEMPTS',
            message: `Demasiados intentos fallidos. Intente de nuevo en ${minutes} minuto(s).`,
            retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  registerFailure(keys: string[], now = Date.now()): void {
    for (const key of keys) {
      const current = this.attempts.get(key);
      const state: AttemptState =
        !current || now - current.windowStart > this.options.windowMs
          ? { failures: 0, windowStart: now, lockedUntil: 0 }
          : current;

      state.failures += 1;
      if (state.failures >= this.options.maxFailures) {
        state.lockedUntil = now + this.options.lockMs;
        state.failures = 0;
        state.windowStart = now;
      }
      this.attempts.set(key, state);
    }
    this.prune(now);
  }

  registerSuccess(keys: string[]): void {
    for (const key of keys) this.attempts.delete(key);
  }

  reset(): void {
    this.attempts.clear();
  }

  private prune(now: number): void {
    if (this.attempts.size < 10_000) return;
    for (const [key, state] of this.attempts) {
      if (state.lockedUntil < now && now - state.windowStart > this.options.windowMs) {
        this.attempts.delete(key);
      }
    }
  }
}
