import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CircleDollarSign,
  Eye,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { InvoiceBreakdown } from '../components/InvoiceBreakdown';
import { PaymentModal } from '../components/PaymentModal';
import { Button, SearchInput, Select } from '../components/ui/Button';
import { InvoiceStatusBadge } from '../components/ui/Badges';
import {
  EmptyState,
  ErrorAlert,
  LoadingBlock,
  PageHeader,
} from '../components/ui/Feedback';
import api, { getErrorMessage } from '../lib/api';
import {
  daysOverdue,
  daysUntil,
  formatDate,
  formatMoney,
  invoiceStatusLabels,
} from '../lib/format';
import type { Invoice, PaginatedResponse } from '../types';

const PAGE_SIZE = 12;

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadInvoices = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const response = await api.get<PaginatedResponse<Invoice>>('/invoices', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(statusFilter !== 'TODOS' ? { estado: statusFilter } : {}),
        },
      });

      if (requestId !== requestIdRef.current) return;

      const pages = Math.max(1, response.data.totalPages);
      setInvoices(response.data.data);
      setTotal(response.data.total);
      setTotalPages(pages);

      if (page > pages) {
        setPage(pages);
      }
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(getErrorMessage(loadError));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('TODOS');
    setPage(1);
  };

  const openPayment = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentOpen(true);
  };

  const handlePaid = (updated: Invoice) => {
    setInvoices((current) =>
      current.map((invoice) => (invoice.id === updated.id ? updated : invoice)),
    );
    setPaymentOpen(false);
    setPaymentInvoice(null);
    void loadInvoices();
  };

  const hasFilters = Boolean(search) || statusFilter !== 'TODOS';

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Facturación"
        title="Cartera"
        description="Consulta las facturas generadas por los alquileres, registra pagos y controla los saldos pendientes de cada cliente."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadInvoices()}
            loading={loading}
          >
            Actualizar
          </Button>
        }
      />

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por factura, cliente o alquiler…"
            className="flex-1"
            aria-label="Buscar facturas"
          />
          <Select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por estado de factura"
            className="lg:w-52"
          >
            <option value="TODOS">Todos los estados</option>
            {Object.entries(invoiceStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            <strong className="text-slate-700">{total}</strong>{' '}
            {total === 1 ? 'factura encontrada' : 'facturas encontradas'}
          </span>
          {hasFilters && (
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

      {error && <ErrorAlert message={error} onRetry={() => void loadInvoices()} />}

      {loading ? (
        <LoadingBlock message="Consultando cartera…" />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No hay facturas para mostrar"
          description={
            hasFilters
              ? 'No encontramos facturas con los filtros seleccionados.'
              : 'Las facturas se generan automáticamente al registrar un alquiler.'
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Link to="/alquileres/nuevo">
                <Button icon={<CircleDollarSign className="h-4 w-4" />}>
                  Registrar alquiler
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="table-th">Factura</th>
                    <th className="table-th">Cliente</th>
                    <th className="table-th">Alquiler</th>
                    <th className="table-th">Vencimiento</th>
                    <th className="table-th text-right">Total</th>
                    <th className="table-th text-right">Saldo</th>
                    <th className="table-th">Estado</th>
                    <th className="table-th text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => {
                    const saldo = Number(invoice.saldo);
                    const overdue =
                      invoice.estado === 'VENCIDA'
                        ? daysOverdue(invoice.fechaVencimiento)
                        : 0;
                    const remaining = daysUntil(invoice.fechaVencimiento);

                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50/60">
                        <td className="table-td">
                          <Link
                            to={`/alquileres/${invoice.alquilerId}#factura`}
                            className="font-mono text-xs font-bold text-slate-800 hover:text-brand-700 hover:underline"
                          >
                            {invoice.codigoFactura}
                          </Link>
                          <p className="mt-0.5 text-[0.6875rem] text-slate-400">
                            Emitida {formatDate(invoice.fechaEmision)}
                          </p>
                        </td>
                        <td className="table-td">
                          <p className="font-medium text-slate-800">
                            {invoice.cliente
                              ? `${invoice.cliente.nombres} ${invoice.cliente.apellidos}`
                              : `Cliente #${invoice.clienteId}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {invoice.cliente?.documentoIdentidad ?? '—'}
                          </p>
                        </td>
                        <td className="table-td">
                          <Link
                            to={`/alquileres/${invoice.alquilerId}`}
                            className="font-mono text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            {invoice.alquiler?.codigoAlquiler ??
                              `Alquiler #${invoice.alquilerId}`}
                          </Link>
                        </td>
                        <td className="table-td">
                          <p
                            className={`text-xs ${
                              overdue > 0
                                ? 'font-semibold text-rose-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {formatDate(invoice.fechaVencimiento)}
                          </p>
                          {invoice.estado !== 'PAGADA' && (
                            <p className="mt-0.5 text-[0.6875rem] text-slate-400">
                              {overdue > 0
                                ? `${overdue} día(s) de atraso`
                                : remaining === 0
                                  ? 'Vence hoy'
                                  : `${remaining} día(s) restantes`}
                            </p>
                          )}
                        </td>
                        <td className="table-td text-right">
                          {invoice.desglose ? (
                            <InvoiceBreakdown
                              desglose={invoice.desglose}
                              variant="compact"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {formatMoney(invoice.total)}
                            </span>
                          )}
                        </td>
                        <td className="table-td text-right">
                          <p
                            className={`font-semibold ${
                              saldo > 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {formatMoney(invoice.saldo)}
                          </p>
                          {invoice.pagos && invoice.pagos.length > 0 && (
                            <p className="mt-0.5 text-[0.6875rem] text-slate-400">
                              {invoice.pagos.length}{' '}
                              {invoice.pagos.length === 1 ? 'pago' : 'pagos'}
                            </p>
                          )}
                        </td>
                        <td className="table-td">
                          <InvoiceStatusBadge status={invoice.estado} />
                        </td>
                        <td className="table-td text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/alquileres/${invoice.alquilerId}#factura`}
                              aria-label={`Ver factura ${invoice.codigoFactura}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Ver factura
                            </Link>
                            {saldo > 0 && invoice.estado !== 'PAGADA' ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={<CircleDollarSign className="h-4 w-4" />}
                                onClick={() => openPayment(invoice)}
                              >
                                Registrar pago
                              </Button>
                            ) : (
                              <span className="text-xs font-medium text-emerald-700">
                                Sin saldo
                              </span>
                            )}
                          </div>
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
          Cada pago reduce el saldo de la factura de forma atómica. Cuando el saldo llega
          a cero, la factura pasa a Pagada; si la fecha de vencimiento ya pasó, se marca
          como Vencida.
        </p>
      </div>

      <PaymentModal
        invoice={paymentInvoice}
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          setPaymentInvoice(null);
        }}
        onPaid={handlePaid}
      />
    </div>
  );
}
