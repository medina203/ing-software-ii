import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Carousel } from '../components/Carousel';
import { DEFAULT_CAROUSEL, useSettings } from '../lib/settings';
import { Button, IconButton } from '../components/ui/Button';
import {
  EmptyState,
  ErrorAlert,
  LoadingBlock,
  MetricCard,
  PageHeader,
  SectionCard,
} from '../components/ui/Feedback';
import { RentalStatusBadge } from '../components/ui/Badges';
import api, { getErrorMessage } from '../lib/api';
import {
  daysOverdue,
  daysUntil,
  formatDate,
  formatDateLong,
  formatMoney,
  itemStatusLabels,
} from '../lib/format';
import type {
  DailyRevenueReport,
  DashboardData,
  ItemStatus,
  StateBreakdown,
} from '../types';

const statusVisuals: Record<ItemStatus, { bar: string; dot: string; text: string }> = {
  DISPONIBLE: {
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  ALQUILADO: {
    bar: 'bg-blue-500',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
  },
  MANTENIMIENTO: {
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
  FUERA_DE_SERVICIO: {
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
    text: 'text-rose-700',
  },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardPage() {
  const { settings } = useSettings();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [revenue, setRevenue] = useState<DailyRevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardResponse, revenueResponse] = await Promise.all([
        api.get<DashboardData>('/reports/dashboard'),
        api.get<DailyRevenueReport>('/reports/revenue/daily', {
          params: { days: 14 },
        }),
      ]);
      setData(dashboardResponse.data);
      setRevenue(revenueResponse.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Panel general"
          title="Resumen operativo"
          description="Cargando indicadores del inventario y la operación…"
        />
        <LoadingBlock />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Panel general" title="Resumen operativo" />
        <ErrorAlert
          message={error || 'No fue posible cargar el panel.'}
          onRetry={loadDashboard}
        />
      </div>
    );
  }

  const { resumen, porEstado, topImplementos, alquileresActivos } = data;
  const firstName = usuario?.nombre.split(' ')[0] ?? '';
  const maxTop = Math.max(1, ...topImplementos.map((item) => item.totalAlquileres));
  const maxDailyRevenue = Math.max(
    1,
    ...(revenue?.data.map((point) => point.total) ?? [0]),
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="theme-fixed relative flex flex-col justify-between overflow-hidden rounded-3xl bg-ink-900 p-6 text-white shadow-xl sm:p-7 lg:col-span-2">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute -bottom-10 right-6 h-24 w-24 -skew-x-12 bg-brand-500/80" />
          <div className="relative">
            <p className="text-xs font-semibold capitalize text-brand-300">
              {formatDateLong(new Date())}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {getGreeting()}, {firstName}.
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              <span className="font-semibold text-white">
                {resumen.alquileresEnCurso} alquileres en curso
              </span>{' '}
              ·{' '}
              <span className="font-semibold text-brand-300">
                {resumen.disponibles} disponibles
              </span>
            </p>
          </div>
          <div className="relative mt-6 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/alquileres/nuevo')}
            >
              Nuevo alquiler
            </Button>
            <Button
              variant="secondary"
              className="border-white/10 bg-white/10 text-white hover:border-white/20 hover:bg-white/15"
              icon={<Boxes className="h-4 w-4" />}
              onClick={() => navigate('/inventario')}
            >
              Inventario
            </Button>
            <IconButton
              icon={RefreshCw}
              label="Actualizar indicadores"
              onClick={() => void loadDashboard()}
              className="border border-white/15 !text-slate-200 hover:!bg-white/10 hover:!text-white"
            />
          </div>
        </section>

        <div className="lg:col-span-3">
          <Carousel
            articles={settings.carrusel.length > 0 ? settings.carrusel : DEFAULT_CAROUSEL}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Total implementos"
          value={<AnimatedNumber value={resumen.totalImplementos} />}
          onClick={() => navigate('/inventario')}
          hint={`${resumen.mantenimiento} en mantenimiento`}
          icon={Boxes}
        />
        <MetricCard
          label="Disponibles"
          value={<AnimatedNumber value={resumen.disponibles} />}
          onClick={() => navigate('/inventario')}
          hint="Listos para alquilar"
          icon={CheckCircle2}
          tone="emerald"
        />
        <MetricCard
          label="Alquileres en curso"
          value={<AnimatedNumber value={resumen.alquileresEnCurso} />}
          onClick={() => navigate('/alquileres')}
          hint={`${resumen.alquilados} implementos fuera`}
          icon={ClipboardList}
          tone="blue"
        />
        <MetricCard
          label="Alquileres vencidos"
          value={<AnimatedNumber value={resumen.alquileresVencidos} />}
          onClick={() => navigate('/devoluciones')}
          hint={
            resumen.alquileresVencidos > 0 ? 'Requieren seguimiento' : 'Sin pendientes'
          }
          icon={AlertTriangle}
          tone={resumen.alquileresVencidos > 0 ? 'rose' : 'slate'}
        />
        <MetricCard
          label="Clientes"
          value={<AnimatedNumber value={resumen.clientesRegistrados} />}
          onClick={() => navigate('/clientes')}
          hint={`${resumen.devolucionesEsteMes} devoluciones este mes`}
          icon={Users}
          tone="amber"
        />
      </div>

      <SectionCard
        title="Ingresos por día"
        description="Últimos 14 días · tarifa diaria de los alquileres"
        action={
          <div className="text-right">
            <p className="text-[0.625rem] font-bold uppercase tracking-wide text-slate-400">
              Total del período
            </p>
            <p className="text-lg font-bold text-slate-900">
              {formatMoney(revenue?.total ?? 0)}
            </p>
          </div>
        }
      >
        {revenue && revenue.total > 0 ? (
          <div className="p-5 sm:p-6">
            <div className="flex min-h-[190px] items-end gap-2 overflow-x-auto pb-1">
              {revenue.data.map((point) => {
                const height = Math.max(4, (point.total / maxDailyRevenue) * 140);
                return (
                  <div
                    key={point.fecha}
                    className="flex min-w-[26px] flex-1 flex-col items-center gap-2"
                    title={`${formatDate(point.fecha)}: ${formatMoney(
                      point.total,
                    )} · ${point.alquileres} alquiler(es)`}
                  >
                    <div className="flex h-[140px] w-full items-end justify-center">
                      <div
                        className={`w-full max-w-[26px] rounded-t-md ${
                          point.total > 0 ? 'bg-brand-500' : 'bg-slate-200'
                        }`}
                        style={{ height: `${height}px` }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-[0.625rem] text-slate-400">
                      {point.fecha.slice(8, 10)}/{point.fecha.slice(5, 7)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                Promedio diario:{' '}
                <strong className="font-semibold text-slate-700">
                  {formatMoney(revenue.promedioDiario)}
                </strong>
              </span>
              <span>Calculado con la tarifa diaria y los días de alquiler.</span>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Wallet}
            title="Sin ingresos en el período"
            description="Registra alquileres para ver aquí el ingreso diario."
            className="border-0"
          />
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-5">
        <SectionCard
          title="Estado del inventario"
          description={`${resumen.totalImplementos} unidades registradas`}
          action={
            <Link
              to="/inventario"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Ver todo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          className="xl:col-span-2"
        >
          <div className="space-y-5 p-5 sm:p-6">
            {porEstado.map((state) => (
              <InventoryBar
                key={state.estado}
                state={state}
                total={resumen.totalImplementos}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Implementos más alquilados"
          description="Histórico acumulado por número de alquileres"
          action={
            <Link
              to="/reportes"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Reportes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          className="xl:col-span-3"
        >
          {topImplementos.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Aún no hay datos"
              description="Cuando se registren alquileres aparecerá aquí el ranking."
              className="border-0"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {topImplementos.map((entry) => (
                <div
                  key={entry.implemento?.id ?? entry.posicion}
                  className="flex items-center gap-4 px-5 py-3.5 sm:px-6"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                    {String(entry.posicion).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {entry.implemento?.nombre ?? 'Implemento eliminado'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.implemento?.codigoSerie} ·{' '}
                      {entry.implemento?.categoria.nombre}
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.max(
                            8,
                            (entry.totalAlquileres / maxTop) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">
                      {entry.totalAlquileres}
                    </p>
                    <p className="text-[0.625rem] uppercase tracking-wide text-slate-400">
                      alquileres
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Alquileres en curso"
        description="Implementos pendientes de devolución y clientes responsables"
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate('/alquileres')}>
            Ver todos
          </Button>
        }
      >
        {alquileresActivos.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No hay alquileres en curso"
            description="Todos los implementos alquilados han sido devueltos."
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="table-th">Código</th>
                  <th className="table-th">Cliente</th>
                  <th className="table-th">Implementos</th>
                  <th className="table-th">Devolución pactada</th>
                  <th className="table-th">Estado</th>
                  <th className="table-th text-right">Tarifa diaria</th>
                  <th className="table-th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alquileresActivos.map((rental) => {
                  const dailyTotal = rental.detalles.reduce(
                    (sum, detail) => sum + Number(detail.precioUnitario),
                    0,
                  );
                  const overdue = daysOverdue(rental.fechaPactadaDevolucion);
                  return (
                    <tr key={rental.id} className="hover:bg-slate-50/60">
                      <td className="table-td font-semibold text-slate-800">
                        {rental.codigoAlquiler}
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
                        <p className="font-medium text-slate-700">
                          {rental.detalles.length}{' '}
                          {rental.detalles.length === 1 ? 'equipo' : 'equipos'}
                        </p>
                        <p className="max-w-[220px] truncate text-xs text-slate-500">
                          {rental.detalles
                            .map((detail) => detail.implemento.codigoSerie)
                            .join(', ')}
                        </p>
                      </td>
                      <td className="table-td">
                        <p className="font-medium text-slate-700">
                          {formatDate(rental.fechaPactadaDevolucion)}
                        </p>
                        <p
                          className={
                            overdue > 0
                              ? 'text-xs font-semibold text-rose-600'
                              : 'text-xs text-slate-500'
                          }
                        >
                          {overdue > 0
                            ? `${overdue} día(s) de retraso`
                            : daysUntil(rental.fechaPactadaDevolucion) === 0
                              ? 'Vence hoy'
                              : `En ${daysUntil(rental.fechaPactadaDevolucion)} día(s)`}
                        </p>
                      </td>
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
                          Ver <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function InventoryBar({ state, total }: { state: StateBreakdown; total: number }) {
  const visual = statusVisuals[state.estado];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${visual.dot}`} />
          <span className="text-sm font-medium text-slate-700">
            {itemStatusLabels[state.estado]}
          </span>
        </div>
        <span className={`text-sm font-bold ${visual.text}`}>
          {state.cantidad}
          <span className="ml-1 text-xs font-medium text-slate-400">
            ({total > 0 ? state.porcentaje : 0}%)
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${visual.bar}`}
          style={{ width: `${state.porcentaje}%` }}
        />
      </div>
    </div>
  );
}
