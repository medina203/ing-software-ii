import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Cuando cambia (p. ej. la ruta), el error se limpia y se vuelve a renderizar. */
  resetKey?: unknown;
  fullPage?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Evita que un error de renderizado deje la aplicación en blanco (H-07,
 * RNF-08). Muestra un mensaje en español y permite reintentar.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      'Error de interfaz capturado por ErrorBoundary:',
      error,
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className={
          this.props.fullPage
            ? 'flex min-h-screen items-center justify-center bg-slate-50 p-6'
            : 'p-2'
        }
      >
        <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">
            Algo salió mal al mostrar esta pantalla
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            El error quedó registrado en la consola. Puedes reintentar o volver al inicio;
            tus datos guardados no se ven afectados.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <RotateCcw className="h-4 w-4" /> Reintentar
            </button>
            <a
              href="/"
              className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }
}
