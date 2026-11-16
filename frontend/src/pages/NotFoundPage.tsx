import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction, Home } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const home = usuario?.rol === 'ADMIN' ? '/' : '/inventario';

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Construction className="h-8 w-8" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Esta página está en obra
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          La dirección que buscas no existe o fue movida. Vuelve al panel para continuar
          con la operación.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Button icon={<Home className="h-4 w-4" />} onClick={() => navigate(home)}>
            Ir al inicio
          </Button>
          <Button
            variant="secondary"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate(-1)}
          >
            Volver atrás
          </Button>
        </div>
      </div>
    </div>
  );
}
