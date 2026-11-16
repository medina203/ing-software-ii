export const SERIAL_PREFIX_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;
export const SERIAL_PREFIX_MIN_LENGTH = 2;
export const SERIAL_PREFIX_MAX_LENGTH = 10;

export function normalizeSerialPrefix(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidSerialPrefix(value: string): boolean {
  return SERIAL_PREFIX_PATTERN.test(normalizeSerialPrefix(value));
}

export function formatSerial(prefix: string, consecutive: number): string {
  const normalizedPrefix = normalizeSerialPrefix(prefix);

  if (!isValidSerialPrefix(normalizedPrefix)) {
    throw new Error(`Prefijo de serial inválido: "${prefix}".`);
  }

  if (!Number.isInteger(consecutive) || consecutive < 1) {
    throw new Error('El consecutivo del serial debe ser un entero positivo.');
  }

  return `${normalizedPrefix}-${String(consecutive).padStart(3, '0')}`;
}

export function extractSerialConsecutive(serial: string, prefix: string): number | null {
  const normalizedPrefix = normalizeSerialPrefix(prefix);
  const normalizedSerial = serial.trim().toUpperCase();
  const escapedPrefix = normalizedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^${escapedPrefix}-(\\d+)$`).exec(normalizedSerial);

  if (!match) return null;

  const consecutive = Number(match[1]);
  return Number.isSafeInteger(consecutive) && consecutive >= 0 ? consecutive : null;
}
