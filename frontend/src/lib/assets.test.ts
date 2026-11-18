import { describe, expect, it } from 'vitest';
import { assetUrl, defaultItemImage, itemIllustration, itemPhoto } from './assets';

describe('imágenes de implementos', () => {
  it('elige la ilustración por el nombre del implemento', () => {
    expect(itemIllustration('Andamio certificado 2 m')).toBe(
      '/ilustraciones/andamio.svg',
    );
    expect(itemIllustration('Taladro percutor Bosch 850 W')).toBe(
      '/ilustraciones/taladro.svg',
    );
    expect(itemIllustration('Kit casco y chaleco reflectivo')).toBe(
      '/ilustraciones/casco.svg',
    );
    expect(itemIllustration('Nivel láser autonivelante')).toBe(
      '/ilustraciones/nivel-laser.svg',
    );
  });

  it('usa la categoría o una ilustración genérica si el nombre no coincide', () => {
    expect(itemIllustration('Pulsador XYZ', 'Seguridad industrial')).toBe(
      '/ilustraciones/casco.svg',
    );
    expect(itemIllustration('Pieza especial', 'Otros')).toBe(
      '/ilustraciones/generico.svg',
    );
  });

  it('las fotos subidas se piden a la API y las ilustraciones al frontend', () => {
    expect(assetUrl('/uploads/items/a.webp')).toMatch(
      /^http:\/\/localhost:4000\/uploads\/items\/a\.webp$/,
    );
    expect(assetUrl('/ilustraciones/andamio.svg')).toBe('/ilustraciones/andamio.svg');
    expect(assetUrl(null)).toBeUndefined();
  });

  it('usa las fotos incluidas cuando el nombre coincide', () => {
    expect(itemPhoto('Andamio certificado 2 m')).toBe('/implementos/andamio-2m.webp');
    expect(itemPhoto('Estación total Topcon')).toBe(
      '/implementos/estacion-total-topcon.webp',
    );
    expect(itemPhoto('KIT de llaves tipo L')).toBe('/implementos/kit-llaves-tipo-l.webp');
    expect(itemPhoto('Kit de llaves tipo estria')).toBe(
      '/implementos/kit-llaves-estria.webp',
    );
    expect(itemPhoto('Taladro percutor Bosch 850 W')).toBeUndefined();
  });

  it('la foto tiene prioridad y la ilustración queda como respaldo', () => {
    expect(defaultItemImage('Arnés de seguridad full body')).toEqual({
      src: '/implementos/arnes-full-body.webp',
      kind: 'foto',
    });
    expect(defaultItemImage('Taladro percutor Bosch 850 W')).toEqual({
      src: '/ilustraciones/taladro.svg',
      kind: 'ilustracion',
    });
  });
});
