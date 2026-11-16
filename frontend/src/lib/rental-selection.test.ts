import { describe, expect, it } from 'vitest';
import type { Item } from '../types';
import {
  countSelectedInGroup,
  groupAvailableItems,
  selectedGroups,
  selectedItemsFromGroups,
  setGroupQuantity,
} from './rental-selection';

function makeItem(
  id: number,
  codigoSerie: string,
  nombre: string,
  categoriaId = 3,
  categoriaNombre = 'Andamios y acceso',
  precioAlquilerDiario = '28000.00',
): Item {
  return {
    id,
    codigoSerie,
    nombre,
    categoriaId,
    descripcion: null,
    precioAlquilerDiario,
    estado: 'DISPONIBLE',
    categoria: { id: categoriaId, nombre: categoriaNombre },
  };
}

const andamios = Array.from({ length: 5 }, (_, index) =>
  makeItem(
    index + 1,
    `AND-${String(index + 1).padStart(3, '0')}`,
    'Andamio certificado 2 m',
  ),
);

const escaleras = [
  makeItem(20, 'AND-020', 'Escalera telescópica 6 m'),
  makeItem(21, 'AND-021', 'Escalera telescópica 6 m'),
];

describe('agrupación de implementos disponibles', () => {
  it('agrupa por tipo y ordena las unidades por serial', () => {
    const groups = groupAvailableItems([...andamios.slice().reverse(), ...escaleras]);

    expect(groups).toHaveLength(2);
    expect(groups[0].nombre).toBe('Andamio certificado 2 m');
    expect(groups[0].items.map((item) => item.codigoSerie)).toEqual([
      'AND-001',
      'AND-002',
      'AND-003',
      'AND-004',
      'AND-005',
    ]);
    expect(groups[1].nombre).toBe('Escalera telescópica 6 m');
  });

  it('selecciona N unidades y conserva la selección de otros grupos', () => {
    const groups = groupAvailableItems([...andamios, ...escaleras]);
    const andamioGroup = groups[0];
    const escaleraGroup = groups[1];

    let selected = setGroupQuantity(andamioGroup, new Set(), 3);
    selected = setGroupQuantity(escaleraGroup, selected, 2);

    expect(countSelectedInGroup(andamioGroup, selected)).toBe(3);
    expect(countSelectedInGroup(escaleraGroup, selected)).toBe(2);
    expect(selectedItemsFromGroups(groups, selected)).toHaveLength(5);
  });

  it('limita la cantidad a la disponibilidad real y permite volver a cero', () => {
    const group = groupAvailableItems(andamios)[0];

    const clamped = setGroupQuantity(group, new Set(), 99);
    expect(countSelectedInGroup(group, clamped)).toBe(5);

    const cleared = setGroupQuantity(group, clamped, 0);
    expect(countSelectedInGroup(group, cleared)).toBe(0);

    const invalid = setGroupQuantity(group, new Set(), Number.NaN);
    expect(countSelectedInGroup(group, invalid)).toBe(0);
  });

  it('calcula cantidad y subtotal por grupo seleccionado', () => {
    const groups = groupAvailableItems([...andamios, ...escaleras]);
    const selected = setGroupQuantity(groups[0], new Set(), 5);

    const summary = selectedGroups(groups, selected);

    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      cantidad: 5,
      subtotal: 140000,
    });
    expect(summary[0].selectedItems.map((item) => item.codigoSerie)).toEqual([
      'AND-001',
      'AND-002',
      'AND-003',
      'AND-004',
      'AND-005',
    ]);
  });
});
