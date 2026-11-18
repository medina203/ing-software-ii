import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  RotateCcw,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { Button, Field, IconButton, Select, TextArea } from '../components/ui/Button';
import { Badge, ItemStatusBadge } from '../components/ui/Badges';
import {
  EmptyState,
  ErrorAlert,
  LoadingBlock,
  SectionCard,
} from '../components/ui/Feedback';
import api, { getErrorMessage } from '../lib/api';
import {
  daysOverdue,
  deliveryStatusLabels,
  formatDate,
  formatMoney,
} from '../lib/format';
import type { DeliveryStatus, PendingInvoicesResponse, Rental } from '../types';

interface ItemReturnState {
  estadoFinal: DeliveryStatus;
  observaciones: string;
}

const INITIAL_ITEM_STATE: ItemReturnState = {
  estadoFinal: 'DISPONIBLE',
  observaciones: '',
};

export function NewReturnPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success } = useToast();

  const [rental, setRental] = useState<Rental | null>(null);
  const [itemStates, setItemStates] = useState<Record<number, ItemReturnState>>({});
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [cartera, setCartera] = useState<PendingInvoicesResponse | null>(null);

  const loadRental = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get<Rental>(`/rentals/${id}`);
      setRental(response.data);
      // RF-15: la alerta de cartera es informativa; si falla no bloquea la devolución.
      api
        .get<PendingInvoicesResponse>(
          `/invoices/client/${response.data.clienteId}/pending`,
        )
        .then((pending) => setCartera(pending.data))
        .catch(() => setCartera(null));
      if (!response.data.devolucion) {
        const states = Object.fromEntries(
          response.data.detalles.map((detail) => [
            detail.implementoId,
            { ...INITIAL_ITEM_STATE },
          ]),
        );
        setItemStates(states);
      }
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRental();
  }, [loadRental]);

  const hasIssues = useMemo(
    () => Object.values(itemStates).some((item) => item.estadoFinal !== 'DISPONIBLE'),
    [itemStates],
  );

  const issueCount = Object.values(itemStates).filter(
    (item) => item.estadoFinal !== 'DISPONIBLE',
  ).length;

  const updateItemState = (implementoId: number, changes: Partial<ItemReturnState>) => {
    setItemStates((current) => ({
      ...current,
      [implementoId]: {
        ...(current[implementoId] ?? INITIAL_ITEM_STATE),
        ...changes,
      },
    }));
  };

  const markAllAvailable = () => {
    if (!rental) return;
    setItemStates(
      Object.fromEntries(
        rental.detalles.map((detail) => [detail.implementoId, { ...INITIAL_ITEM_STATE }]),
      ),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!rental) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.post('/returns', {
        alquilerId: rental.id,
        observaciones: observations.trim() || undefined,
        implementos: rental.detalles.map((detail) => {
          const state = itemStates[detail.implementoId] ?? INITIAL_ITEM_STATE;
          return {
            implementoId: detail.implementoId,
            estadoFinal: state.estadoFinal,
            observaciones: state.observaciones.trim() || undefined,
          };
        }),
      });
      success('Devolución registrada. El alquiler quedó finalizado.');
      navigate(`/alquileres/${rental.id}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <IconButton
            icon={ArrowLeft}
            label="Volver"
            variant="secondary"
            onClick={() => navigate('/devoluciones')}
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
              Devoluciones
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Preparando devolución…</h1>
          </div>
        </div>
        <LoadingBlock />
      </div>
    );
  }

  if (loadError || !rental) {
    return (
      <div className="space-y-6">
        <ErrorAlert
          message={loadError || 'Alquiler no encontrado.'}
          onRetry={() => void loadRental()}
        />
        <EmptyState
          icon={RotateCcw}
          title="No fue posible cargar el alquiler"
          description="Verifica el enlace o vuelve a la lista de devoluciones pendientes."
          action={
            <Button variant="secondary" onClick={() => navigate('/devoluciones')}>
              Volver a devoluciones
            </Button>
          }
        />
      </div>
    );
  }

  if (rental.estado === 'FINALIZADO' || rental.devolucion) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <IconButton
            icon={ArrowLeft}
            label="Volver"
            variant="secondary"
            onClick={() => navigate(`/alquileres/${rental.id}`)}
          />
          <h1 className="text-2xl font-bold text-slate-900">Devolución ya registrada</h1>
        </div>
        <EmptyState
          icon={CheckCircle2}
          title="Este alquiler ya fue finalizado"
          description="La devolución de este alquiler ya se encuentra registrada. Puedes revisar el detalle y la inspección en el historial."
          action={
            <Button onClick={() => navigate(`/alquileres/${rental.id}`)}>
              Ver detalle del alquiler
            </Button>
          }
        />
      </div>
    );
  }

  const overdue = daysOverdue(rental.fechaPactadaDevolucion);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <IconButton
            icon={ArrowLeft}
            label="Volver al detalle del alquiler"
            variant="secondary"
            onClick={() => navigate(`/alquileres/${rental.id}`)}
            className="mt-1"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              Devolución de implementos
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Registrar devolución
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Alquiler{' '}
              <span className="font-mono font-semibold text-slate-700">
                {rental.codigoAlquiler}
              </span>{' '}
              · {rental.cliente.nombres} {rental.cliente.apellidos}
            </p>
          </div>
        </div>
        <Badge tone="amber">{rental.detalles.length} equipos por recibir</Badge>
      </div>

      {overdue > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Devolución con retraso</p>
            <p className="mt-0.5 text-xs leading-5 text-rose-700">
              La fecha pactada era el {formatDate(rental.fechaPactadaDevolucion)} y
              presenta {overdue} día(s) de retraso. Puedes registrar la devolución
              igualmente.
            </p>
          </div>
        </div>
      )}

      {cartera && cartera.cantidad > 0 && (
        <div
          role="status"
          data-testid="return-cartera-alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Cliente con cartera pendiente</p>
            <p className="mt-0.5 text-xs leading-5 text-amber-800">
              Saldo de {formatMoney(cartera.totalSaldo)} en {cartera.cantidad}{' '}
              {cartera.cantidad === 1 ? 'factura' : 'facturas'}
              {cartera.vencidas > 0 && ` (${cartera.vencidas} vencida(s))`}. Infórmale al
              cliente; la devolución se puede registrar y la alerta quedará registrada. Al
              confirmar, la factura de este alquiler se liquida con los días reales.
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid items-start gap-6 xl:grid-cols-[1fr_360px]"
      >
        <div className="space-y-6">
          <SectionCard
            title="Datos de recepción"
            description="Información del alquiler y del cliente que entrega."
          >
            <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
              <div className="flex items-start gap-2.5">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                    Cliente
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-700">
                    {rental.cliente.nombres} {rental.cliente.apellidos}
                  </p>
                  <p className="text-xs text-slate-500">
                    {rental.cliente.documentoIdentidad}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                    Fecha de devolución
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-700">
                    {formatDate(new Date())}
                  </p>
                  <p className="text-xs text-slate-500">Se registra al confirmar</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                    Devolución pactada
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-700">
                    {formatDate(rental.fechaPactadaDevolucion)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Tarifa diaria{' '}
                    {formatMoney(
                      rental.detalles.reduce(
                        (sum, item) => sum + Number(item.precioUnitario),
                        0,
                      ),
                    )}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Inspección de implementos"
            description="Indica el estado físico real de cada equipo recibido."
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={<CheckCircle2 className="h-4 w-4" />}
                onClick={markAllAvailable}
              >
                Todo en buen estado
              </Button>
            }
          >
            <div className="divide-y divide-slate-100">
              {rental.detalles.map((detail, index) => {
                const state = itemStates[detail.implementoId] ?? INITIAL_ITEM_STATE;
                return (
                  <div key={detail.implementoId} className="space-y-4 p-5 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-mono text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                            {detail.implemento.codigoSerie}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-800">
                            {detail.implemento.nombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            {detail.implemento.categoria.nombre}
                          </p>
                        </div>
                      </div>
                      <ItemStatusBadge status={detail.implemento.estado} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                      <Field
                        label="Estado final"
                        htmlFor={`estado-${detail.implementoId}`}
                      >
                        <Select
                          id={`estado-${detail.implementoId}`}
                          value={state.estadoFinal}
                          onChange={(event) =>
                            updateItemState(detail.implementoId, {
                              estadoFinal: event.target.value as DeliveryStatus,
                            })
                          }
                        >
                          {Object.entries(deliveryStatusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        label="Novedades del equipo"
                        htmlFor={`obs-${detail.implementoId}`}
                        hint="Opcional. Se guardará en el historial de devolución."
                      >
                        <TextArea
                          id={`obs-${detail.implementoId}`}
                          value={state.observaciones}
                          onChange={(event) =>
                            updateItemState(detail.implementoId, {
                              observaciones: event.target.value,
                            })
                          }
                          rows={1}
                          maxLength={300}
                          placeholder="Ej.: rayones leves, falta de accesorio, requiere mantenimiento…"
                          className="min-h-11"
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Observaciones generales"
            description="Detalles del proceso de recepción."
          >
            <div className="p-5 sm:p-6">
              <Field
                label="Observaciones de la devolución"
                htmlFor="observaciones"
                hint="Opcional: acuerdos, daños generales o comentarios del cliente."
              >
                <TextArea
                  id="observaciones"
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Ej.: el cliente reporta una falla eléctrica en una de las herramientas…"
                />
              </Field>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="card overflow-hidden">
            <div className="bg-ink-900 px-5 py-5 text-white">
              <div className="flex items-center gap-2 text-brand-300">
                <RotateCcw className="h-4 w-4" />
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider">
                  Resumen de devolución
                </p>
              </div>
              <p className="mt-2 text-lg font-bold">
                {hasIssues ? 'Con novedades' : 'Sin novedades'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {rental.detalles.length} implementos · {issueCount} con novedad(es)
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div className="space-y-2.5">
                <SummaryRow
                  icon={PackageCheck}
                  label="Retornan a disponible"
                  count={
                    Object.values(itemStates).filter(
                      (item) => item.estadoFinal === 'DISPONIBLE',
                    ).length
                  }
                  tone="text-emerald-600"
                />
                <SummaryRow
                  icon={Wrench}
                  label="Envían a mantenimiento"
                  count={
                    Object.values(itemStates).filter(
                      (item) => item.estadoFinal === 'MANTENIMIENTO',
                    ).length
                  }
                  tone="text-amber-600"
                />
                <SummaryRow
                  icon={Ban}
                  label="Fuera de servicio"
                  count={
                    Object.values(itemStates).filter(
                      (item) => item.estadoFinal === 'FUERA_DE_SERVICIO',
                    ).length
                  }
                  tone="text-rose-600"
                />
              </div>

              {hasIssues && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
                  Los equipos con novedades no volverán a estar disponibles hasta que el
                  administrador los habilite nuevamente.
                </div>
              )}

              {submitError && <ErrorAlert message={submitError} />}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                icon={<RotateCcw className="h-4 w-4" />}
                loading={submitting}
              >
                Confirmar devolución
              </Button>
              <p className="text-center text-[0.625rem] leading-4 text-slate-400">
                El alquiler pasará a Finalizado y los estados del inventario se
                actualizarán en una sola transacción.
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  count,
  tone,
}: {
  icon: typeof PackageCheck;
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className={`h-4 w-4 ${tone}`} />
      <span className="flex-1 text-xs text-slate-600">{label}</span>
      <span className="text-xs font-bold text-slate-800">{count}</span>
    </div>
  );
}
