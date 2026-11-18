import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ItemImage } from './ItemImage';

describe('ItemImage', () => {
  it('prioriza la foto subida', () => {
    render(
      <ItemImage nombre="Andamio certificado 2 m" imagenUrl="/uploads/items/a.webp" />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('data-kind', 'subida');
  });

  it('sin foto subida usa la foto incluida y, si falla, la ilustración', () => {
    render(<ItemImage nombre="Andamio certificado 2 m" />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', '/implementos/andamio-2m.webp');

    fireEvent.error(image);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/ilustraciones/andamio.svg');
  });

  it('sin foto incluida usa la ilustración del tipo', () => {
    render(<ItemImage nombre="Taladro percutor Bosch 850 W" />);
    expect(screen.getByRole('img')).toHaveAttribute('data-kind', 'ilustracion');
  });
});
