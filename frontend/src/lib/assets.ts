import api from './api';

/** Origen de la API (las imágenes subidas se sirven desde /uploads en la API). */
function apiOrigin(): string {
  const base = api.defaults.baseURL ?? '/api';
  try {
    return new URL(base, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

/** Convierte una ruta guardada (/uploads/… o /ilustraciones/…) en URL utilizable. */
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  if (path.startsWith('/uploads/')) return `${apiOrigin()}${path}`;
  return path;
}

const ILLUSTRATIONS: Array<[RegExp, string]> = [
  [/andamio/, 'andamio'],
  [/escalera/, 'escalera'],
  [/taladro|rotomartillo|atornillador/, 'taladro'],
  [/esmeril|pulidora|cortadora/, 'esmeriladora'],
  [/demoledor|martillo/, 'martillo-demoledor'],
  [/mezcladora|concreto|trompo/, 'mezcladora'],
  [/compactador|saltar|apisonador|vibro/, 'compactadora'],
  [/generador|planta el/, 'generador'],
  [/nivel|laser|láser/, 'nivel-laser'],
  [/estaci[oó]n total|teodolito|topograf/, 'estacion-total'],
  [/arn[eé]s|eslinga|l[ií]nea de vida/, 'arnes'],
  [/casco|chaleco|guante|gafas|epp/, 'casco'],
];

const CATEGORY_FALLBACK: Array<[RegExp, string]> = [
  [/andamio|acceso/, 'andamio'],
  [/el[eé]ctric|herramient/, 'taladro'],
  [/maquinaria/, 'generador'],
  [/medici[oó]n|topograf/, 'nivel-laser'],
  [/seguridad/, 'casco'],
];

/** Ilustración incluida que corresponde al tipo de implemento. */
export function itemIllustration(nombre: string, categoria = ''): string {
  const name = nombre.toLowerCase();
  const match =
    ILLUSTRATIONS.find(([pattern]) => pattern.test(name)) ??
    CATEGORY_FALLBACK.find(([pattern]) => pattern.test(categoria.toLowerCase()));
  return `/ilustraciones/${match?.[1] ?? 'generico'}.svg`;
}
