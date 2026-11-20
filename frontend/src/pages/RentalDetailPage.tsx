import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  Package,
  Phone,
  Printer,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Button, IconButton } from '../components/ui/Button';
import {
  DeliveryStatusBadge,
  InvoiceStatusBadge,
  RentalStatusBadge,
} from '../components/ui/Badges';
import {
  EmptyState,
  ErrorAlert,
  LoadingBlock,
  SectionCard,
} from '../components/ui/Feedback';
import { InvoiceBreakdown } from '../components/InvoiceBreakdown';
import api, { getErrorMessage } from '../lib/api';
import {
  daysOverdue,
  daysUntil,
  formatDate,
  formatDateTime,
  formatMoney,
  paymentMethodLabels,
} from '../lib/format';
import type { Rental } from '../types';

export function RentalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [highlightInvoice, setHighlightInvoice] = useState(false);
  const navigate = useNavigate();
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRental = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get<Rental>(`/rentals/${id}`);
      setRental(response.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRental();
  }, [loadRental]);

  // Desde Cartera se llega con #factura: se desplaza y resalta la factura.
  const rentalLoaded = Boolean(rental);
  useEffect(() => {
    if (!rentalLoaded || location.hash !== '#factura') return;
    invoiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightInvoice(true);
    const timeout = window.setTimeout(() => setHighlightInvoice(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [rentalLoaded, location.hash]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <IconButton
            icon={ArrowLeft}
            label="Volver"
            variant="secondary"
            onClick={() => navigate('/alquileres')}
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
              Alquiler
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Cargando detalle…</h1>
          </div>
        </div>
        <LoadingBlock />
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="space-y-6">
        <ErrorAlert message={error || 'Alquiler no encontrado.'} />
        <EmptyState
          icon={FileText}
          title="No fue posible abrir el alquiler"
          description="Verifica que el alquiler exista o vuelve al historial."
          action={
            <Button
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate('/alquileres')}
            >
              Volver al historial
            </Button>
          }
        />
      </div>
    );
  }

  const dailyTotal = rental.detalles.reduce(
    (sum, detail) => sum + Number(detail.precioUnitario),
    0,
  );
  const isFinished = rental.estado === 'FINALIZADO' || Boolean(rental.devolucion);
  const overdue = isFinished ? 0 : daysOverdue(rental.fechaPactadaDevolucion);
  const remaining = daysUntil(rental.fechaPactadaDevolucion);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <IconButton
            icon={ArrowLeft}
            label="Volver al historial"
            variant="secondary"
            onClick={() => navigate('/alquileres')}
            className="mt-1"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              Detalle de alquiler
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {rental.codigoAlquiler}
              </h1>
              <RentalStatusBadge status={rental.estado} />
            </div>
            <p className="mt-1.5 text-sm text-slate-500">
              Registrado el {formatDateTime(rental.fechaAlquiler)} por{' '}
              {rental.usuario.nombre}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Button
            variant="secondary"
            icon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            Imprimir
          </Button>
          {!isFinished && (
            <Button
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => navigate(`/devoluciones/nueva/${rental.id}`)}
            >
              Registrar devolución
            </Button>
          )}
        </div>
      </div>

      {!isFinished && overdue > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Devolución vencida</p>
            <p className="mt-0.5 text-xs leading-5 text-rose-700">
              La fecha pactada era el {formatDate(rental.fechaPactadaDevolucion)}. Han
              transcurrido {overdue} día(s) de retraso.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionCard
            title="Implementos del alquiler"
            description="Precios congelados al momento de registrar el alquiler."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="table-th">Código</th>
                    <th className="table-th">Implemento</th>
                    <th className="table-th">Categoría</th>
                    <th className="table-th">Estado actual</th>
                    <th className="table-th text-right">Precio / día</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rental.detalles.map((detail) => (
                    <tr key={detail.id}>
                      <td className="table-td font-mono text-xs font-semibold text-slate-800">
                        {detail.implemento.codigoSerie}
                      </td>
                      <td className="table-td">
                        <p className="font-medium text-slate-800">
                          {detail.implemento.nombre}
                        </p>
                        {rental.devolucion && (
                          <ReturnedItemNote
                            implementoId={detail.implementoId}
                            returnDetails={rental.devolucion.detalles}
                          />
                        )}
                      </td>
                      <td className="table-td">{detail.implemento.categoria.nombre}</td>
                      <td className="table-td">
                        {rental.devolucion ? (
                          <ReturnedItemBadge
                            implementoId={detail.implementoId}
                            returnDetails={rental.devolucion.detalles}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Alquilado
                          </span>
                        )}
                      </td>
                      <td className="table-td text-right font-semibold text-slate-800">
                        {formatMoney(detail.precioUnitario)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50/60">
                  <tr>
                    <td
                      className="px-5 py-4 text-sm font-semibold text-slate-600"
                      colSpan={4}
                    >
                      Tarifa diaria total
                    </td>
                    <td className="px-5 py-4 text-right text-base font-bold text-slate-900">
                      {formatMoney(dailyTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          {rental.devolucion ? (
            <SectionCard
              title="Devolución registrada"
              description="Inspección física y estado final de cada implemento."
              action={
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${
                    rental.devolucion.estadoEntregaImplementos === 'Sin novedades'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {rental.devolucion.estadoEntregaImplementos}
                </span>
              }
            >
              <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
                <InfoLabel
                  icon={CalendarDays}
                  label="Fecha de devolución"
                  value={formatDateTime(rental.devolucion.fechaDevolucion)}
                />
                <InfoLabel
                  icon={UserRound}
                  label="Recibido por"
                  value={rental.devolucion.usuario.nombre}
                />
                <InfoLabel
                  icon={ShieldCheck}
                  label="Novedades"
                  value={
                    rental.devolucion.estadoEntregaImplementos === 'Sin novedades'
                      ? 'Ninguna'
                      : 'Requiere revisión'
                  }
                />
              </div>

              <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                <div className="space-y-3">
                  {rental.devolucion.detalles.map((detail) => (
                    <div
                      key={detail.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          {detail.implemento.codigoSerie} · {detail.implemento.nombre}
                        </p>
                        {detail.observaciones && (
                          <p className="mt-1 text-xs text-slate-500">
                            {detail.observaciones}
                          </p>
                        )}
                      </div>
                      <DeliveryStatusBadge status={detail.estadoFinal} />
                    </div>
                  ))}
                </div>
              </div>

              {rental.devolucion.observaciones && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:px-6">
                  <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                    Observaciones generales
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">
                    {rental.devolucion.observaciones}
                  </p>
                </div>
              )}
            </SectionCard>
          ) : (
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Devolución pendiente
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    Registra la inspección física para liberar o enviar a mantenimiento
                    los implementos.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/devoluciones/nueva/${rental.id}`)}
              >
                Procesar devolución
              </Button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <SectionCard title="Cliente responsable">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {rental.cliente.nombres.charAt(0)}
                  {rental.cliente.apellidos.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {rental.cliente.nombres} {rental.cliente.apellidos}
                  </p>
                  <p className="text-xs text-slate-500">
                    {rental.cliente.documentoIdentidad}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                <a
                  href={`tel:${rental.cliente.telefono}`}
                  className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-brand-600"
                >
                  <Phone className="h-4 w-4 text-slate-400" />
                  {rental.cliente.telefono}
                </a>
                {rental.cliente.correo && (
                  <a
                    href={`mailto:${rental.cliente.correo}`}
                    className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-brand-600"
                  >
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="break-all">{rental.cliente.correo}</span>
                  </a>
                )}
                <div className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Package className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>{rental.cliente.direccion || 'Sin dirección registrada'}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Fechas y seguimiento">
            <div className="space-y-4 p-5">
              <InfoLabel
                icon={CalendarDays}
                label="Fecha de alquiler"
                value={formatDate(rental.fechaAlquiler)}
              />
              <InfoLabel
                icon={Clock}
                label="Devolución pactada"
                value={formatDate(rental.fechaPactadaDevolucion)}
              />
              <div
                className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${
                  isFinished
                    ? 'bg-emerald-50 text-emerald-700'
                    : overdue > 0
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-sky-50 text-sky-700'
                }`}
              >
                {isFinished
                  ? 'Alquiler finalizado'
                  : overdue > 0
                    ? `${overdue} día(s) de retraso`
                    : remaining === 0
                      ? 'La devolución vence hoy'
                      : `${remaining} día(s) para la devolución`}
              </div>
            </div>
          </SectionCard>

          {rental.factura && (
            <div
              id="factura"
              ref={invoiceRef}
              className={`scroll-mt-24 rounded-2xl transition-shadow duration-700 ${
                highlightInvoice ? 'ring-4 ring-brand-400/60' : ''
              }`}
            >
              <SectionCard title="Factura">
                <div className="space-y-3 p-5 text-sm" data-testid="rental-invoice">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {rental.factura.codigoFactura}
                    </span>
                    <InvoiceStatusBadge status={rental.factura.estado} />
                  </div>
                  {rental.factura.desglose ? (
                    <InvoiceBreakdown desglose={rental.factura.desglose} />
                  ) : (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Total</span>
                      <span className="font-semibold text-slate-800">
                        {formatMoney(rental.factura.total)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Vence</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(rental.factura.fechaVencimiento)}
                    </span>
                  </div>
                  {rental.factura.pagos && rental.factura.pagos.length > 0 && (
                    <div className="rounded-xl border border-slate-100">
                      <p className="border-b border-slate-100 px-3 py-2 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                        Pagos registrados
                      </p>
                      <ul
                        className="divide-y divide-slate-100"
                        data-testid="invoice-payments"
                      >
                        {rental.factura.pagos.map((pago) => (
                          <li
                            key={pago.id}
                            className="flex justify-between gap-2 px-3 py-2 text-xs"
                          >
                            <span className="text-slate-500">
                              {formatDate(pago.fechaPago)} ·{' '}
                              {paymentMethodLabels[pago.metodoPago]}
                              {pago.referencia ? ` · ${pago.referencia}` : ''}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {formatMoney(pago.monto)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[0.6875rem] leading-4 text-slate-400">
                    {isFinished
                      ? 'Liquidada con los días reales del alquiler.'
                      : 'Incluye los días transcurridos hasta hoy; queda liquidada al registrar la devolución.'}
                  </p>
                  {rental.devolucion?.alertaCartera && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-[0.6875rem] text-amber-800">
                      Al recibir la devolución el cliente tenía cartera pendiente
                      {rental.devolucion.saldoCarteraAlerta
                        ? ` por ${formatMoney(rental.devolucion.saldoCarteraAlerta)}`
                        : ''}
                      .
                    </p>
                  )}
                  <Link
                    to="/cartera"
                    className="text-xs font-semibold text-brand-700 underline"
                  >
                    Ir a cartera
                  </Link>
                </div>
              </SectionCard>
            </div>
          )}

          <SectionCard title="Observaciones">
            <div className="p-5">
              <div className="flex items-start gap-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p className="text-sm leading-6 text-slate-600">
                  {rental.observaciones || 'Sin observaciones registradas.'}
                </p>
              </div>
            </div>
          </SectionCard>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">
            <p className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Registro auditable
            </p>
            <p className="mt-1 text-emerald-700">
              Este alquiler conserva la trazabilidad del cliente, los equipos y el usuario
              responsable.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReturnedItemNote({
  implementoId,
  returnDetails,
}: {
  implementoId: number;
  returnDetails: NonNullable<Rental['devolucion']>['detalles'];
}) {
  const detail = returnDetails.find((item) => item.implementoId === implementoId);
  if (!detail?.observaciones) return null;
  return (
    <p className="mt-1 text-[0.6875rem] italic text-slate-500">
      Devolución: {detail.observaciones}
    </p>
  );
}

function ReturnedItemBadge({
  implementoId,
  returnDetails,
}: {
  implementoId: number;
  returnDetails: NonNullable<Rental['devolucion']>['detalles'];
}) {
  const detail = returnDetails.find((item) => item.implementoId === implementoId);
  return detail ? (
    <DeliveryStatusBadge status={detail.estadoFinal} />
  ) : (
    <RentalStatusBadge status="FINALIZADO" />
  );
}

function InfoLabel({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}
