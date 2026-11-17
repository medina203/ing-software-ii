import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('fallo de render');
  return <p>Contenido estable</p>;
}

describe('ErrorBoundary (RNF-08)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('muestra un mensaje en lugar de dejar la pantalla en blanco', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal');
  });

  it('permite reintentar cuando el problema desaparece', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let explode = true;

    function Harness() {
      const [, force] = useState(0);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              explode = false;
              force((n) => n + 1);
            }}
          >
            arreglar
          </button>
          <ErrorBoundary>
            <Bomb explode={explode} />
          </ErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    await userEvent.click(screen.getByText('arreglar'));
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }));

    expect(screen.getByText('Contenido estable')).toBeInTheDocument();
  });
});
