import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  PieChart,
  Printer,
  RefreshCw,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { Button, IconButton, Select } from '../components/ui/Button';
import { RentalStatusBadge } from '../components/ui/Badges';
import {
  EmptyState,
  ErrorAlert,
  LoadingBlock,
  MetricCard,
  PageHeader,
  SectionCard,
  Spinner,
} from '../components/ui/Feedback';
import api, { getErrorMessage } from '../lib/api';
import {
  daysOverdue,
  formatDate,
  formatDateOnly,
  formatDateTime,
  formatMoney,
  itemStatusLabels,
} from '../lib/format';
import type {
  DashboardData,
  InventorySummary,
  ItemStatus,
  ListResponse,
  MonthlyRevenueReport,
  Rental,
  TopItem,
} from '../types';

const stateColors: Record<ItemStatus, { hex: string; className: string }> = {
  DISPONIBLE: { hex: '#10b981', className: 'bg-emerald-500' },
  ALQUILADO: { hex: '#3b82f6', className: 'bg-blue-500' },
  MANTENIMIENTO: { hex: '#f59e0b', className: 'bg-amber-500' },
  FUERA_DE_SERVICIO: { hex: '#f43f5e', className: 'bg-rose-500' },
};

export function ReportsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [monthlyRevenue, setMonthlyRevenue] =
    useState<MonthlyRevenueReport | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardResponse, inventoryResponse, topResponse, activeResponse] =
        await Promise.all([
          api.get<DashboardData>('/reports/dashboard'),
          api.get<InventorySummary>('/reports/inventory-summary'),
          api.get<TopItem[]>('/reports/top-items', { params: { limit: 10 } }),
          api.get<ListResponse<Rental>>('/reports/active-rentals'),
        ]);
      setDashboard(dashboardResponse.data);
      setInventory(inventoryResponse.data);
      setTopItems(topResponse.data);
      setActiveRentals(activeResponse.data.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonthlyRevenue = useCallback(async (year: number) => {
    setRevenueLoading(true);
    setRevenueError('');
    try {
      const response = await api.get<MonthlyRevenueReport>(
        '/reports/revenue/monthly',
        { params: { year } },
      );
      setMonthlyRevenue(response.data);
    } catch (loadError) {
      setRevenueError(getErrorMessage(loadError));
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    void loadMonthlyRevenue(selectedYear);
  }, [loadMonthlyRevenue, selectedYear]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Analítica"
          title="Reportes e indicadores"
          description="Generando métricas del inventario y la operación…"
        />
        <LoadingBlock />
      </div>
    );
  }

  if (error || !dashboard || !inventory) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Analítica" title="Reportes e indicadores" />
        <ErrorAlert
          message={error || 'No fue posible generar los reportes.'}
          onRetry={loadReports}
        />
      </div>
    );
  }

  const maxTop = Math.max(1, ...topItems.map((item) => item.totalAlquileres));
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: 5 },
    (_, index) => currentYear - index,
  );
  const maxMonthlyRevenue = Math.max(
    1,
    ...(monthlyRevenue?.meses.map((month) => month.total) ?? [0]),
  );
  const gradientStops = inventory.porEstado
    .reduce<{ stops: string[]; current: number }>(
      (accumulator, state) => {
        const start = accumulator.current;
        const end = start + state.porcentaje;
        accumulator.stops.push(
          `${stateColors[state.estado].hex} ${start}% ${end}%`,
        );
        accumulator.current = end;
        return accumulator;
      },
      { stops: [], current: 0 },
    )
    .stops.join(', ');

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Analítica"
        title="Reportes e indicadores"
        description="Ingresos mensuales, resumen del inventario, equipos más alquilados y alquileres pendientes de devolución."
        actions={
          <div className="flex gap-2 no-print">
            <IconButton
              icon={RefreshCw}
              label="Actualizar reportes"
              onClick={() => {
                void loadReports();
                void loadMonthlyRevenue(selectedYear);
              }}
              variant="secondary"
            />
            <Button
              variant="secondary"
              icon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          Fecha de corte:{' '}
          <strong className="font-semibold text-slate-700">
            {formatDateOnly(dashboard.fechaCorte)}
          </strong>
        </span>
        <span>
          Datos actualizados: {formatDateTime(dashboard.generadoEn)}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total implementos"
          value={dashboard.resumen.totalImplementos}
          hint="Unidades en el catálogo"
          icon={Boxes}
        />
        <MetricCard
          label="Alquileres en curso"
          value={dashboard.resumen.alquileresEnCurso}
          hint={`${dashboard.resumen.alquilados} equipos alquilados`}
          icon={ClipboardList}
          tone="blue"
        />
        <MetricCard
          label="Alquileres vencidos"
          value={dashboard.resumen.alquileresVencidos}
          hint="Pendientes de devolución"
          icon={AlertTriangle}
          tone={dashboard.resumen.alquileresVencidos > 0 ? 'rose' : 'slate'}
        />
        <MetricCard
          label="Clientes registrados"
          value={dashboard.resumen.clientesRegistrados}
          hint={`${dashboard.resumen.devolucionesEsteMes} devoluciones este mes`}
          icon={Users}
          tone="amber"
        />
      </div>

      <SectionCard
        title="Ingresos totales por mes"
        description="Ingresos devengados por alquileres, agrupados por mes."
        action={
          <div className="flex items-center gap-2">
            <label
              htmlFor="revenue-year"
              className="text-xs font-semibold text-slate-500"
            >
              Año
            </label>
            <Select
              id="revenue-year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="h-9 w-28 py-1.5"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        {revenueLoading ? (
          <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-500">
            <Spinner />
            Calculando ingresos…
          </div>
        ) : revenueError ? (
          <div className="p-5 sm:p-6">
            <ErrorAlert
              message={revenueError}
              onRetry={() => void loadMonthlyRevenue(selectedYear)}
            />
          </div>
        ) : monthlyRevenue && monthlyRevenue.total > 0 ? (
          <div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-4">
              {monthlyRevenue.meses.map((month) => (
                <div
                  key={month.mes}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {month.nombre}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {month.alquileres} alq.
                    </span>
                  </div>
                  <p className="mt-1.5 text-lg font-bold text-slate-900">
                    {formatMoney(month.total)}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{
                        width: `${
                          month.total > 0
                            ? Math.max(
                                4,
                                (month.total / maxMonthlyRevenue) * 100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-sm text-slate-600 sm:px-6">
              <span>
                Total {monthlyRevenue.year}:{' '}
                <strong className="font-bold text-slate-900">
                  {formatMoney(monthlyRevenue.total)}
                </strong>
              </span>
              <span className="text-xs text-slate-500">
                Los alquileres en curso se calculan hasta hoy.
              </span>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Wallet}
            title={`Sin ingresos registrados en ${selectedYear}`}
            description="Selecciona otro año o registra alquileres para ver los totales mensuales."
            className="border-0"
          />
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-5">
        <SectionCard
          title="Resumen del inventario por estado"
          description="Distribución actual del catálogo"
          className="xl:col-span-2"
        >
          <div className="flex flex-col items-center gap-6 p-5 sm:p-6">
            <div
              className="relative flex h-44 w-44 items-center justify-center rounded-full"
              style={{
                background:
                  inventory.total > 0 && gradientStops
                    ? `conic-gradient(${gradientStops})`
                    : '#e2e8f0',
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                <span className="text-3xl font-bold text-slate-900">
                  {inventory.total}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Implementos
                </span>
              </div>
            </div>

            <div className="w-full space-y-3">
              {inventory.porEstado.map((state) => (
                <div
                  key={state.estado}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        stateColors[state.estado].className
                      }`}
                    />
                    <span className="text-sm text-slate-600">
                      {itemStatusLabels[state.estado]}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-800">
                      {state.cantidad}
                    </span>
                    <span className="ml-1.5 text-xs text-slate-400">
                      {state.porcentaje}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Implementos más alquilados"
          description="Ranking histórico por cantidad de alquileres"
          action={<Trophy className="h-5 w-5 text-amber-500" />}
          className="xl:col-span-3"
        >
          {topItems.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Aún no hay alquileres"
              description="El ranking se construirá a medida que se registren alquileres."
              className="border-0"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {topItems.map((entry) => (
                <div
                  key={entry.implemento?.id ?? entry.posicion}
                  className="flex items-center gap-4 px-5 py-3.5 sm:px-6"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      entry.posicion <= 3
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {entry.posicion}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {entry.implemento?.nombre ?? 'Implemento no disponible'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.implemento?.codigoSerie} ·{' '}
                      {entry.implemento?.categoria.nombre}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.max(
                            6,
                            (entry.totalAlquileres / maxTop) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {entry.totalAlquileres}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
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
        title="Implementos actualmente en alquiler"
        description="Clientes responsables y fechas de devolución pactadas"
        action={
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            {activeRentals.length} en curso
          </span>
        }
      >
        {activeRentals.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title="No hay implementos alquilados"
            description="Todos los implementos del inventario están disponibles o fuera de operación."
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="table-th">Alquiler</th>
                  <th className="table-th">Cliente responsable</th>
                  <th className="table-th">Implementos alquilados</th>
                  <th className="table-th">Fecha de salida</th>
                  <th className="table-th">Devolución pactada</th>
                  <th className="table-th">Estado</th>
                  <th className="table-th text-right">Tarifa diaria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRentals.map((rental) => {
                  const overdue = daysOverdue(
                    rental.fechaPactadaDevolucion,
                  );
                  return (
                    <tr key={rental.id} className="hover:bg-slate-50/60">
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
                          {rental.cliente.documentoIdentidad} ·{' '}
                          {rental.cliente.telefono}
                        </p>
                      </td>
                      <td className="table-td">
                        <div className="max-w-sm space-y-0.5">
                          {rental.detalles.map((detail) => (
                            <p
                              key={detail.id}
                              className="text-xs text-slate-600"
                            >
                              <span className="font-mono text-[10px] font-semibold text-slate-500">
                                {detail.implemento.codigoSerie}
                              </span>{' '}
                              {detail.implemento.nombre}
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="table-td">
                        {formatDate(rental.fechaAlquiler)}
                      </td>
                      <td className="table-td">
                        <p className="font-medium text-slate-700">
                          {formatDate(rental.fechaPactadaDevolucion)}
                        </p>
                        {overdue > 0 && (
                          <p className="text-xs font-semibold text-rose-600">
                            {overdue} día(s) de retraso
                          </p>
                        )}
                      </td>
                      <td className="table-td">
                        <RentalStatusBadge status={rental.estado} />
                      </td>
                      <td className="table-td text-right">
                        <span className="font-semibold text-slate-800">
                          {formatMoney(
                            rental.detalles.reduce(
                              (sum, detail) =>
                                sum + Number(detail.precioUnitario),
                              0,
                            ),
                          )}
                        </span>
                        <Link
                          to={`/alquileres/${rental.id}`}
                          className="ml-3 inline-flex items-center text-brand-600 hover:text-brand-700"
                          aria-label="Ver detalle"
                        >
                          <ArrowRight className="h-4 w-4" />
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
