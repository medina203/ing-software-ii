/**
 * Normaliza un término de búsqueda para consultas Prisma:
 * elimina espacios extremos y colapsa espacios internos.
 */
export function normalizeSearchTerm(value?: string | null): string | undefined {
  const term = value?.trim().replace(/\s+/g, ' ');
  return term ? term : undefined;
}
