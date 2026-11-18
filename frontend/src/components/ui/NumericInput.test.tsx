import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { NumericInput, sanitizeNumeric } from './NumericInput';

function Harness({ maxDigits, decimals }: { maxDigits: number; decimals?: number }) {
  const [value, setValue] = useState('');
  return (
    <NumericInput
      aria-label="campo"
      value={value}
      onValueChange={setValue}
      maxDigits={maxDigits}
      decimals={decimals}
    />
  );
}

describe('campos numéricos', () => {
  it('elimina letras y símbolos', () => {
    expect(sanitizeNumeric('31a0-55b5 12', 10)).toBe('31055512');
  });

  it('respeta el límite de dígitos', () => {
    expect(sanitizeNumeric('3001234567890', 10)).toBe('3001234567');
  });

  it('admite decimales cuando se piden y normaliza la coma', () => {
    expect(sanitizeNumeric('5000,567', 9, 2)).toBe('5000.56');
    expect(sanitizeNumeric('12.3.4', 9, 2)).toBe('12.34');
  });

  it('no deja escribir letras y corta en el máximo de dígitos', async () => {
    render(<Harness maxDigits={10} />);
    const input = screen.getByLabelText('campo');

    await userEvent.type(input, 'abc300x123-4567999');

    expect(input).toHaveValue('3001234567');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });

  it('limpia el texto pegado', async () => {
    render(<Harness maxDigits={9} />);
    const input = screen.getByLabelText('campo');
    input.focus();

    await userEvent.paste('$ 45.000 COP');

    expect(input).toHaveValue('45000');
  });
});
