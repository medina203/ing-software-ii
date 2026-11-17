import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Minus,
  PackageOpen,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  Button,
  Field,
  SearchInput,
  Select,
  TextArea,
  TextInput,
} from '../components/ui/Button';
import {
  EmptyState,
  ErrorAlert,
  LoadingBlock,
  PageHeader,
} from '../components/ui/Feedback';
import { CarteraAuthorizationModal } from '../components/CarteraAuthorizationModal';
import { ClientSearchSelect } from '../components/ClientSearchSelect';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthContext';
import api, { getErrorMessage } from '../lib/api';
import { formatMoney, itemStatusLabels } from '../lib/format';
import type {
  Client,
  Item,
  ListResponse,
  PendingInvoicesResponse,
  RentalCarteraAuthorization,
} from '../types';

function defaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function minDate(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function NewRentalPage() {
  const navigate = useNavigate();
  const { success } = useToast();
  const { usuario } = useAuth();
  const isAdmin = usuario?.rol === 'ADMIN';

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [authorization, setAuthorization] = useState<{
    motivo: string;
    adminEmail?: string;
    adminPassword?: string;
  }>({
    motivo: '',
  });
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [pendingCartera, setPendingCartera] = useState<PendingInvoicesResponse | null>(
    null,
  );
  const carteraRequestRef = useRef(0);

  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [observations, setObservations] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const [itemSearch, setItemSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const itemsResponse = await api.get<ListResponse<Item>>('/items/available');
      setAvailableItems(itemsResponse.data.data);
      setQuantityErrors({});
      setSelectedIds((current) => {
        const availableIds = new Set(itemsResponse.data.data.map((item) => item.id));
        return new Set([...current].filter((id) => availableIds.has(id)));
      });
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedClientId = selectedClient?.id;

  useEffect(() => {
    setAuthorizationOpen(false);
    setSubmitError('');
  }, [selectedClientId]);

  const loadCartera = useCallback(async () => {
    const requestId = ++carteraRequestRef.current;

    if (!selectedClientId) {
      setPendingCartera(null);
      setCarteraError('');
      setCarteraLoading(false);
      return;
    }

    setCarteraLoading(true);
    setCarteraError('');

    try {
      const response = await api.get<PendingInvoicesResponse>(
        `/invoices/client/${selectedClientId}/pending`,
      );
      if (requestId !== carteraRequestRef.current) return;
      setPendingCartera(response.data);
    } catch (error) {
      if (requestId !== carteraRequestRef.current) return;
      setPendingCartera(null);
      setCarteraError(getErrorMessage(error));
    } finally {
      if (requestId === carteraRequestRef.current) {
        setCarteraLoading(false);
      }
    }
  }, [selectedClientId]);

  useEffect(() => {
    void loadCartera();
  }, [loadCartera]);

  const categories = useMemo(() => {
    const map = new Map<number, string>();
    availableItems.forEach((item) => map.set(item.categoria.id, item.categoria.nombre));
    return [...map.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [availableItems]);

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();

    return availableItems.filter((item) => {
      const matchesCategory =
        categoryFilter === 'TODAS' || item.categoria.id === Number(categoryFilter);
      const matchesTerm =
        !term ||
        item.codigoSerie.toLowerCase().includes(term) ||
        item.nombre.toLowerCase().includes(term);

      return matchesCategory && matchesTerm;
    });
  }, [availableItems, itemSearch, categoryFilter]);

  const dailyTotal = useMemo(() => {
    const selected = selectedIds;
    return filteredItems
      .filter((item) => selected.has(item.id))
      .reduce((sum, item) => sum + Number(item.precioAlquilerDiario), 0);
  }, [filteredItems, selectedIds]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    if (!selectedClient) {
      setSubmitError('Seleccione un cliente para el alquiler.');
      return;
    }
    if (selectedIds.size === 0) {
      setSubmitError('Seleccione al menos una unidad disponible.');
      return;
    }

    // Si hay cartera pendiente y aún no hay autorización, abrir el modal
    if (pendingCartera && pendingCartera.totalSaldo > 0 && !authorization.motivo) {
      setAuthorizationOpen(true);
      return;
    }

    // Construir el cuerpo con autorización opcional
    const body: any = {
      clienteId: selectedClient.id,
      fechaPactadaDevolucion: dueDate,
      observaciones: observations.trim() || undefined,
      implementos: filteredItems
        .filter((item) => selectedIds.has(item.id))
        .map((item) => ({
          implementoId: item.id,
          cantidad: 1, // Cada item seleccionado contribuye una vez al alquiler
        })),
    };

    if (authorization.motivo) {
      body.autorizacionCartera = {
        motivo: authorization.motivo,
        ...(!isAdmin && authorization.adminEmail && authorization.adminPassword
          ? {
              adminEmail: authorization.adminEmail,
              adminPassword: authorization.adminPassword,
            }
          : {}),
      };
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ id: number }>('/rentals', body);
      success('Alquiler registrado correctamente.');
      navigate(`/alquileres/${response.data.id}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onAuthorize = (auth: {
    motivo: string;
    adminEmail?: string;
    adminPassword?: string;
  }) => {
    setAuthorization(auth);
    setAuthorizationOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Alquileres"
          title="Registrar nuevo alquiler"
          description="Preparando clientes e implementos disponibles…"
        />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Alquileres"
        title="Registrar nuevo alquiler"
        description="Selecciona el cliente, la fecha de devolución y las unidades disponibles. Marca los implementos que necesitas y la cantidad por cada uno."
        actions={
          <Link to="/alquileres">
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
              Volver al historial
            </Button>
          </Link>
        }
      />

      {loadError && <ErrorAlert message={loadError} onRetry={() => void loadData()} />}

      <form
        onSubmit={handleSubmit}
        className="grid items-start gap-6 xl:grid-cols-[1fr_360px]"
      >
        <div className="space-y-6">
          <SectionCard
            title="Datos del alquiler"
            description="Cliente responsable y fecha acordada para la devolución."
          >
            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <Field
                label="Cliente"
                htmlFor="cliente"
                required
                hint="El alquiler quedará asociado a este cliente."
              >
                <ClientSearchSelect
                  id="cliente"
                  value={selectedClient}
                  onChange={setSelectedClient}
                  required
                />
              </Field>

              <Field
                label="Fecha pactada de devolución"
                htmlFor="fecha"
                required
                hint="Puede ser hoy o una fecha futura."
              >
                <TextInput
                  id="fecha"
                  type="date"
                  min={minDate()}
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                />
              </Field>

              <Field
                label="Observaciones"
                htmlFor="observaciones"
                className="sm:col-span-2"
                hint="Opcional: condiciones de entrega acordadas con el cliente."
              >
                <TextArea
                  id="observaciones"
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Ej.: entrega en bodega, incluye accesorios, responsable de retiro…"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Implementos disponibles"
            description="Marca los implementos que necesitas para el alquiler. Cada uno se contará como una unidad."
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={() => void loadData()}
              >
                Actualizar
              </Button>
            }
          >
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <SearchInput
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder="Buscar implemento por nombre o código…"
                  className="flex-1"
                  aria-label="Buscar implementos disponibles"
                />
                <Select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  aria-label="Filtrar por categoría"
                  className="sm:w-56"
                >
                  <option value="TODAS">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nombre}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {availableItems.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title="No hay implementos disponibles"
                description="Todos los implementos están alquilados, en mantenimiento o fuera de servicio. Actualiza la lista más tarde."
                action={
                  <Button variant="secondary" onClick={() => void loadData()}>
                    Actualizar disponibilidad
                  </Button>
                }
                className="border-0"
              />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title="Sin resultados"
                description="Prueba con otro nombre, código o categoría."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setItemSearch('');
                      setCategoryFilter('TODAS');
                    }}
                  >
                    Limpiar filtros
                  </Button>
                }
                className="border-0"
              />
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const currentQuantity = isSelected ? 1 : 0;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 transition ${
                        isSelected ? 'border-brand-500 bg-brand-50/40 ring-4 ring-brand-500/10' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {item.codigoSerie}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.nombre}
                          </p>
                        </div>
                        <span
                          className={`inline-flex min-w-[3rem] items-center justify-center rounded-lg px-2 py-1 text-xs font-bold ${
                            isSelected ? 'bg-brand-500 text-ink-900' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isSelected ? '1' : '0'}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <span className="text-sm font-bold text-slate-900">
                          {formatMoney(item.precioAlquilerDiario)}
                          <span className="ml-1 text-[10px] font-medium text-slate-400">
                            / día
                          </span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedIds((prev) => new Set([...prev].filter((id) => id !== item.id)));
                              } else {
                                setSelectedIds((prev) => new Set([...prev, item.id]));
                              }
                            }}
                            disabled={isSelected}
                            aria-label={`Quitar ${item.codigoSerie} del alquiler`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="mx-2 text-[10px] text-slate-500">·</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIds((prev) => new Set([...prev, item.id]));
                            }}
                            disabled={isSelected}
                            aria-label={`Agregar ${item.codigoSerie} al alquiler`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {isSelected && (
                        <p className="mt-2 text-[10px] leading-4 text-slate-500">
                          Implemento seleccionado para el alquiler
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="card overflow-hidden">
            <div className="bg-ink-900 px-5 py-5 text-white">
              <div className="flex items-center gap-2 text-brand-300">
                <ClipboardCheck className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase tracking-wider">
                  Resumen del alquiler
                </p>
              </div>
              <p className="mt-2 text-3xl font-bold">{formatMoney(dailyTotal)}</p>
              <p className="mt-1 text-xs text-slate-400">
                Tarifa diaria · {selectedIds.size}{' '}
                {selectedIds.size === 1 ? 'unidad' : 'unidades'}
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-start gap-2.5 text-sm">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Devolución pactada</p>
                  <p className="text-xs text-slate-500">
                    {dueDate || 'Seleccione una fecha'}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Unidades
                  </p>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedIds.size}
                  </span>
                </div>
                {selectedIds.size === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs leading-5 text-slate-500">
                    Selecciona implementos disponibles del catálogo.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    {selectedIds.size} implemento{' '}{selectedIds.size === 1 ? 'seleccionado' : 'seleccionados'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </aside>
      </form>

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p>
          Cada implemento seleccionado contribuye al alquiler. Al confirmar, las unidades
          seleccionadas cambiarán a estado Alquilado de manera automática.
        </p>
      </div>

      <CarteraAuthorizationModal
        open={authorizationOpen}
        onClose={() => {
          setAuthorizationOpen(false);
        }}
        onAuthorize={onAuthorize}
        pending={pendingCartera}
        isAdmin={isAdmin}
        loading={submitting}
        error={''}
      />
    </div>
  );
}