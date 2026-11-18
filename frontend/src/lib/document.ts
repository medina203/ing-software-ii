/** Tipos de documento admitidos y longitud del número (solo dígitos). */
export const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de ciudadanía', min: 6, max: 10 },
  { value: 'CE', label: 'Cédula de extranjería', min: 6, max: 10 },
  { value: 'TI', label: 'Tarjeta de identidad', min: 6, max: 10 },
  { value: 'NIT', label: 'NIT', min: 9, max: 9 },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]['value'];

export interface DocumentParts {
  tipo: DocumentType;
  numero: string;
  /** Dígito de verificación (solo NIT). */
  dv: string;
}

export function documentRule(tipo: DocumentType) {
  return DOCUMENT_TYPES.find((type) => type.value === tipo) ?? DOCUMENT_TYPES[0];
}

/** Separa "CC-10324567" o "NIT-900123456-7" en tipo, número y DV. */
export function parseDocument(value: string): DocumentParts {
  const match = /^(CC|CE|TI|NIT)-(\d+)(?:-(\d))?$/.exec(value.trim().toUpperCase());
  if (match) {
    return { tipo: match[1] as DocumentType, numero: match[2], dv: match[3] ?? '' };
  }
  // Valores antiguos sin formato: se conservan solo los dígitos para corregirlos.
  return { tipo: 'CC', numero: value.replace(/\D/g, '').slice(0, 10), dv: '' };
}

export function buildDocument({ tipo, numero, dv }: DocumentParts): string {
  return tipo === 'NIT' ? `NIT-${numero}-${dv}` : `${tipo}-${numero}`;
}

/** Mensaje de error o cadena vacía si el documento es válido. */
export function validateDocument({ tipo, numero, dv }: DocumentParts): string {
  const rule = documentRule(tipo);
  if (!/^\d+$/.test(numero) || numero.length < rule.min || numero.length > rule.max) {
    return rule.min === rule.max
      ? `El ${rule.label} debe tener ${rule.min} dígitos.`
      : `La ${rule.label.toLowerCase()} debe tener entre ${rule.min} y ${rule.max} dígitos.`;
  }
  if (tipo === 'NIT' && !/^\d$/.test(dv)) {
    return 'Ingrese el dígito de verificación del NIT.';
  }
  return '';
}

/** Teléfono: 7 a 10 dígitos. */
export function validatePhone(phone: string): string {
  return /^\d{7,10}$/.test(phone) ? '' : 'El teléfono debe tener entre 7 y 10 dígitos.';
}
