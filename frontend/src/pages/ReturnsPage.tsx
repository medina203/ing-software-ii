import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import { Button, IconButton } from '../components/ui/Button';
import { DeliveryStatusBadge, RentalStatusBadge } from '../components/ui/Badges';
import {
  EmptyState,
  ErrorAlert,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '../components/ui/Feedback';
import api, { getErrorMessage } from '../lib/api';
import { daysOverdue, formatDate, formatDateTime, formatMoney } from '../lib/format';
import type { ListResponse, PaginatedResponse, Rental, ReturnRecord } from '../types';

export function ReturnsPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<Rental[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingResponse, returnsResponse] = await Promise.all([
        api.get<ListResponse<Rental>>('/returns/pending'),
        api.get<PaginatedResponse<ReturnRecord>>('/returns', {
          params: { page: 1, pageSize: 20 },
        }),
      ]);
      setPending(pendingResponse.data.data);
      setReturns(returnsResponse.data.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Operación"
        title="Devoluciones"
        description="Recibe los implementos pendientes, registra la inspección física y consulta las novedades de devoluciones recientes."
        actions={
          <IconButton
            icon={RefreshCw}
            label="Actualizar devoluciones"
            onClick={() => void loadData()}
            variant="secondary"
          />
        }
      />

      {error && <ErrorAlert message={error} onRetry={loadData} />}

      {loading ? (
        <LoadingBlock message="Cargando devoluciones…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pending.length}</p>
                <p className="text-sm text-slate-500">
                  Alquileres pendientes de devolución
                </p>
              </div>
            </div>
            <div className="card flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{returns.length}</p>
                <p className="text-sm text-slate-500">
                  Devoluciones recientes registradas
                </p>
              </div>
            </div>
          </div>

          <SectionCard
            title="Pendientes de recepción"
            description="Selecciona un alquiler para inspeccionar los implementos y registrar su devolución."
          >
            {pending.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No hay devoluciones pendientes"
                description="Todos los alquileres en curso ya tienen una devolución registrada."
                className="border-0"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {pending.map((rental) => {
                  const overdue = daysOverdue(rental.fechaPactadaDevolucion);
                  return (
                    <div
                      key={rental.id}
                      className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            overdue > 0
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-brand-100 text-brand-700'
                          }`}
                        >
                          {overdue > 0 ? (
                            <AlertTriangle className="h-5 w-5" />
                          ) : (
                            <RotateCcw className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/alquileres/${rental.id}`}
                              className="font-mono text-xs font-bold text-slate-800 hover:text-brand-600"
                            >
                              {rental.codigoAlquiler}
                            </Link>
                            <RentalStatusBadge status={rental.estado} />
                            {overdue > 0 && (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                {overdue} día(s) de retraso
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                            <UserRound className="h-3.5 w-3.5 text-slate-400" />
                            {rental.cliente.nombres} {rental.cliente.apellidos}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Pactada: {formatDate(rental.fechaPactadaDevolucion)}
                            </span>
                            <span>
                              {rental.detalles.length}{' '}
                              {rental.detalles.length === 1
                                ? 'implemento'
                                : 'implementos'}
                            </span>
                            <span>
                              {formatMoney(
                                rental.detalles.reduce(
                                  (sum, detail) => sum + Number(detail.precioUnitario),
                                  0,
                                ),
                              )}{' '}
                              / día
                            </span>
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {rental.detalles.map((detail) => (
                              <span
                                key={detail.id}
                                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500"
                              >
                                {detail.implemento.codigoSerie}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 sm:pl-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/alquileres/${rental.id}`)}
                        >
                          Ver alquiler
                        </Button>
                        <Button
                          size="sm"
                          icon={<RotateCcw className="h-4 w-4" />}
                          onClick={() => navigate(`/devoluciones/nueva/${rental.id}`)}
                        >
                          Recibir
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Devoluciones recientes"
            description="Inspección registrada y estado final asignado a cada equipo."
          >
            {returns.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="Aún no hay devoluciones"
                description="Las devoluciones registradas aparecerán aquí con el detalle de novedades."
                className="border-0"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="table-th">Alquiler</th>
                      <th className="table-th">Cliente</th>
                      <th className="table-th">Devolución</th>
                      <th className="table-th">Recibido por</th>
                      <th className="table-th">Implementos</th>
                      <th className="table-th">Novedades</th>
                      <th className="table-th" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returns.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/60">
                        <td className="table-td">
                          <Link
                            to={`/alquileres/${record.alquilerId}`}
                            className="font-mono text-xs font-bold text-slate-800 hover:text-brand-600"
                          >
                            {record.alquiler?.codigoAlquiler ?? `#${record.alquilerId}`}
                          </Link>
                        </td>
                        <td className="table-td">
                          <p className="font-medium text-slate-800">
                            {record.alquiler?.cliente.nombres}{' '}
                            {record.alquiler?.cliente.apellidos}
                          </p>
                          <p className="text-xs text-slate-500">
                            {record.alquiler?.cliente.documentoIdentidad}
                          </p>
                        </td>
                        <td className="table-td">
                          {formatDateTime(record.fechaDevolucion)}
                        </td>
                        <td className="table-td">{record.usuario.nombre}</td>
                        <td className="table-td">
                          <div className="flex flex-wrap gap-1">
                            {record.detalles.map((detail) => (
                              <span
                                key={detail.id}
                                title={`${detail.implemento.nombre}: ${detail.estadoFinal}`}
                                className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500"
                              >
                                {detail.implemento.codigoSerie}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="flex flex-col items-start gap-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                record.estadoEntregaImplementos === 'Sin novedades'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {record.estadoEntregaImplementos}
                            </span>
                            <div className="flex gap-1">
                              {record.detalles
                                .filter((detail) => detail.estadoFinal !== 'DISPONIBLE')
                                .slice(0, 2)
                                .map((detail) => (
                                  <DeliveryStatusBadge
                                    key={detail.id}
                                    status={detail.estadoFinal}
                                  />
                                ))}
                            </div>
                          </div>
                        </td>
                        <td className="table-td text-right">
                          <Link
                            to={`/alquileres/${record.alquilerId}`}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                          >
                            Ver <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
