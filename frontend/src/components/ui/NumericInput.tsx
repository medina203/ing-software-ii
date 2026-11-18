import type { InputHTMLAttributes } from 'react';
import { TextInput } from './Button';

type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'type'
> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Cantidad máxima de dígitos (parte entera). */
  maxDigits: number;
  /** Permite decimales con punto o coma (se normaliza a punto). */
  decimals?: number;
};

/**
 * Campo que solo acepta números: bloquea letras al escribir y al pegar, limita
 * la cantidad de dígitos y abre el teclado numérico en el celular.
 */
export function sanitizeNumeric(raw: string, maxDigits: number, decimals = 0): string {
  if (decimals <= 0) return raw.replace(/\D/g, '').slice(0, maxDigits);

  const normalized = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const [integer = '', ...rest] = normalized.split('.');
  const fraction = rest.join('').slice(0, decimals);
  const intPart = integer.slice(0, maxDigits);
  return normalized.includes('.') ? `${intPart}.${fraction}` : intPart;
}

export function NumericInput({
  value,
  onValueChange,
  maxDigits,
  decimals = 0,
  ...props
}: NumericInputProps) {
  return (
    <TextInput
      {...props}
      type="text"
      inputMode={decimals > 0 ? 'decimal' : 'numeric'}
      autoComplete={props.autoComplete ?? 'off'}
      value={value}
      maxLength={maxDigits + (decimals > 0 ? decimals + 1 : 0)}
      onKeyDown={(event) => {
        // Bloquea letras y símbolos; permite navegación, edición y atajos.
        if (event.ctrlKey || event.metaKey || event.altKey || event.key.length > 1)
          return;
        const allowed = decimals > 0 ? /[\d.,]/ : /\d/;
        if (!allowed.test(event.key)) event.preventDefault();
      }}
      onChange={(event) =>
        onValueChange(sanitizeNumeric(event.target.value, maxDigits, decimals))
      }
    />
  );
}
