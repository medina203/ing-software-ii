import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Eye,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Button, IconButton, SearchInput, Select } from '../components/ui/Button';
import { RentalStatusBadge } from '../components/ui/Badges';
import {
  EmptyState,
  ErrorAlert,
  LoadingBlock,
  PageHeader,
} from '../components/ui/Feedback';
import api, { getErrorMessage } from '../lib/api';
import { daysOverdue, formatDate, formatMoney, rentalStatusLabels } from '../lib/format';
import type { PaginatedResponse, Rental } from '../types';

const PAGE_SIZE = 12;

export function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let active = true;

    async function loadRentals() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<PaginatedResponse<Rental>>('/rentals', {
          params: {
            page,
            pageSize: PAGE_SIZE,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(statusFilter !== 'TODOS' ? { estado: statusFilter } : {}),
          },
        });
        if (!active) return;
        setRentals(response.data.data);
        setTotal(response.data.total);
        setTotalPages(Math.max(1, response.data.totalPages));
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRentals();
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, statusFilter, reloadToken]);

  const retry = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('TODOS');
    setPage(1);
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Operación"
        title="Alquileres"
        description="Consulta el historial completo, verifica vencimientos y accede al detalle auditable de cada alquiler."
        actions={
          <>
            <IconButton
              icon={RefreshCw}
              label="Actualizar alquileres"
              onClick={retry}
              variant="secondary"
            />
            <Link to="/alquileres/nuevo">
              <Button icon={<Plus className="h-4 w-4" />}>Registrar alquiler</Button>
            </Link>
          </>
        }
      />

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código de alquiler, cliente o documento…"
            className="flex-1"
            aria-label="Buscar alquileres"
          />
          <Select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por estado del alquiler"
            className="lg:w-52"
          >
            <option value="TODOS">Todos los estados</option>
            {Object.entries(rentalStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            <strong className="text-slate-700">{total}</strong> alquileres encontrados
          </span>
          {(search || statusFilter !== 'TODOS') && (
            <button
              type="button"
              onClick={clearFilters}
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={retry} />}

      {loading ? (
        <LoadingBlock message="Consultando alquileres…" />
      ) : rentals.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay alquileres para mostrar"
          description={
            search || statusFilter !== 'TODOS'
              ? 'No encontramos alquileres con los filtros seleccionados.'
              : 'Registra el primer alquiler para iniciar el historial de la operación.'
          }
          action={
            search || statusFilter !== 'TODOS' ? (
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Link to="/alquileres/nuevo">
                <Button icon={<Plus className="h-4 w-4" />}>Registrar alquiler</Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="table-th">Código</th>
                    <th className="table-th">Cliente</th>
                    <th className="table-th">Implementos</th>
                    <th className="table-th">Fechas</th>
                    <th className="table-th">Registrado por</th>
                    <th className="table-th">Estado</th>
                    <th className="table-th text-right">Tarifa diaria</th>
                    <th className="table-th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rentals.map((rental) => {
                    const dailyTotal = rental.detalles.reduce(
                      (sum, item) => sum + Number(item.precioUnitario),
                      0,
                    );
                    const overdue = daysOverdue(rental.fechaPactadaDevolucion);
                    return (
                      <tr key={rental.id} className="group hover:bg-slate-50/60">
                        <td className="table-td">
                          <Link
                            to={`/alquileres/${rental.id}`}
                            className="font-mono text-xs font-bold text-slate-800 hover:text-brand-600"
                          >
                            {rental.codigoAlquiler}
                          </Link>
                        </td>
                        <td className="table-td">
                          <p className="font-medium text-slate-800">
                            {rental.cliente.nombres} {rental.cliente.apellidos}
                          </p>
                          <p className="text-xs text-slate-500">
                            {rental.cliente.documentoIdentidad}
                          </p>
                        </td>
                        <td className="table-td">
                          <div className="flex flex-wrap gap-1">
                            {rental.detalles.slice(0, 2).map((detail) => (
                              <span
                                key={detail.id}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[0.625rem] font-semibold text-slate-600"
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    detail.implemento.estado === 'DISPONIBLE'
                                      ? 'bg-emerald-500'
                                      : 'bg-blue-500'
                                  }`}
                                />
                                {detail.implemento.codigoSerie}
                              </span>
                            ))}
                            {rental.detalles.length > 2 && (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[0.625rem] font-semibold text-slate-500">
                                +{rental.detalles.length - 2}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[0.6875rem] text-slate-400">
                            {rental.detalles.length}{' '}
                            {rental.detalles.length === 1 ? 'implemento' : 'implementos'}
                          </p>
                        </td>
                        <td className="table-td">
                          <p className="text-xs">
                            <span className="text-slate-400">Alquiler:</span>{' '}
                            {formatDate(rental.fechaAlquiler)}
                          </p>
                          <p
                            className={`mt-0.5 text-xs ${
                              overdue > 0 && rental.estado !== 'FINALIZADO'
                                ? 'font-semibold text-rose-600'
                                : ''
                            }`}
                          >
                            <span className="text-slate-400">Devolución:</span>{' '}
                            {formatDate(rental.fechaPactadaDevolucion)}
                          </p>
                        </td>
                        <td className="table-td text-sm">{rental.usuario.nombre}</td>
                        <td className="table-td">
                          <RentalStatusBadge status={rental.estado} />
                        </td>
                        <td className="table-td text-right font-semibold text-slate-800">
                          {formatMoney(dailyTotal)}
                        </td>
                        <td className="table-td text-right">
                          <Link
                            to={`/alquileres/${rental.id}`}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                          >
                            <Eye className="h-4 w-4" />
                            Detalle
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-slate-500">
              Página {page} de {totalPages} · {total} registros
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p>
          Cada alquiler conserva el cliente, los implementos, el usuario que lo registró y
          las fechas pactadas. Los alquileres se marcan como vencidos automáticamente al
          superar la fecha de devolución.
        </p>
      </div>
    </div>
  );
}
