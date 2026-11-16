import type { Item } from '../types';

export interface AvailableItemGroup {
  key: string;
  nombre: string;
  categoriaId: number;
  categoriaNombre: string;
  precioUnitario: string;
  items: Item[];
}

export interface SelectedItemGroup extends AvailableItemGroup {
  selectedItems: Item[];
  cantidad: number;
  subtotal: number;
}

function normalizedPrice(item: Item): string {
  return Number(item.precioAlquilerDiario).toFixed(2);
}

function groupKey(item: Item): string {
  return `${item.categoria.id}::${item.nombre.trim().toLowerCase()}::${normalizedPrice(item)}`;
}

export function groupAvailableItems(items: Item[]): AvailableItemGroup[] {
  const groups = new Map<string, AvailableItemGroup>();

  for (const item of items) {
    const key = groupKey(item);
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(key, {
      key,
      nombre: item.nombre.trim(),
      categoriaId: item.categoria.id,
      categoriaNombre: item.categoria.nombre,
      precioUnitario: item.precioAlquilerDiario,
      items: [item],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort(
        (left, right) =>
          left.codigoSerie.localeCompare(right.codigoSerie) || left.id - right.id,
      ),
    }))
    .sort(
      (left, right) =>
        left.nombre.localeCompare(right.nombre) ||
        left.categoriaNombre.localeCompare(right.categoriaNombre) ||
        left.key.localeCompare(right.key),
    );
}

export function countSelectedInGroup(
  group: AvailableItemGroup,
  selectedIds: ReadonlySet<number>,
): number {
  return group.items.reduce(
    (count, item) => count + (selectedIds.has(item.id) ? 1 : 0),
    0,
  );
}

export function setGroupQuantity(
  group: AvailableItemGroup,
  selectedIds: ReadonlySet<number>,
  quantity: number,
): Set<number> {
  const groupIds = new Set(group.items.map((item) => item.id));
  const next = new Set([...selectedIds].filter((id) => !groupIds.has(id)));
  const normalizedQuantity = Number.isFinite(quantity) ? Math.trunc(quantity) : 0;
  const safeQuantity = Math.max(0, Math.min(group.items.length, normalizedQuantity));

  group.items.slice(0, safeQuantity).forEach((item) => next.add(item.id));

  return next;
}

export function selectedItemsFromGroups(
  groups: AvailableItemGroup[],
  selectedIds: ReadonlySet<number>,
): Item[] {
  return groups.flatMap((group) =>
    group.items.filter((item) => selectedIds.has(item.id)),
  );
}

export function selectedGroups(
  groups: AvailableItemGroup[],
  selectedIds: ReadonlySet<number>,
): SelectedItemGroup[] {
  return groups.flatMap((group) => {
    const items = group.items.filter((item) => selectedIds.has(item.id));

    if (items.length === 0) return [];

    return [
      {
        ...group,
        selectedItems: items,
        cantidad: items.length,
        subtotal: Number(group.precioUnitario) * items.length,
      },
    ];
  });
}
