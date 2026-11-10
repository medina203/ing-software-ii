import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardCheck,
  PackageOpen,
  Plus,
  RefreshCw,
  UserRound,
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
  SectionCard,
} from '../components/ui/Feedback';
import { ItemStatusBadge } from '../components/ui/Badges';
import { useToast } from '../components/Toast';
import api, { getErrorMessage } from '../lib/api';
import { formatMoney, itemStatusLabels } from '../lib/format';
import type { Client, Item, ListResponse } from '../types';

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

  const [clients, setClients] = useState<Client[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [observations, setObservations] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [itemSearch, setItemSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientsResponse, itemsResponse] = await Promise.all([
        api.get<ListResponse<Client>>('/clients'),
        api.get<ListResponse<Item>>('/items/available'),
      ]);
      setClients(clientsResponse.data.data);
      setAvailableItems(itemsResponse.data.data);
      setSelectedIds((current) => {
        const availableIds = new Set(
          itemsResponse.data.data.map((item) => item.id),
        );
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

  const categories = useMemo(() => {
    const map = new Map<number, string>();
    availableItems.forEach((item) =>
      map.set(item.categoria.id, item.categoria.nombre),
    );
    return [...map.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [availableItems]);

  const filteredItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();
    return availableItems.filter((item) => {
      const matchesTerm =
        !term ||
        item.nombre.toLowerCase().includes(term) ||
        item.codigoSerie.toLowerCase().includes(term);
      const matchesCategory =
        categoryFilter === 'TODAS' ||
        item.categoria.id === Number(categoryFilter);
      return matchesTerm && matchesCategory;
    });
  }, [availableItems, itemSearch, categoryFilter]);

  const selectedItems = availableItems.filter((item) =>
    selectedIds.has(item.id),
  );
  const selectedClient = clients.find(
    (client) => client.id === Number(clientId),
  );
  const dailyTotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.precioAlquilerDiario),
    0,
  );

  const toggleItem = (itemId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    if (!clientId) {
      setSubmitError('Seleccione un cliente para el alquiler.');
      return;
    }
    if (selectedItems.length === 0) {
      setSubmitError('Seleccione al menos un implemento disponible.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ id: number }>('/rentals', {
        clienteId: Number(clientId),
        fechaPactadaDevolucion: dueDate,
        observaciones: observations.trim() || undefined,
        implementos: selectedItems.map((item) => ({
          implementoId: item.id,
        })),
      });
      success('Alquiler registrado correctamente.');
      navigate(`/alquileres/${response.data.id}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
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
        description="Selecciona el cliente, la fecha de devolución y los implementos disponibles. El inventario se bloqueará de forma atómica al confirmar."
        actions={
          <Link to="/alquileres">
            <Button
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Volver al historial
            </Button>
          </Link>
        }
      />

      {loadError && (
        <ErrorAlert
          message={loadError}
          onRetry={() => void loadData()}
        />
      )}

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
                <Select
                  id="cliente"
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  required
                >
                  <option value="">Seleccione un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nombres} {client.apellidos} ·{' '}
                      {client.documentoIdentidad}
                    </option>
                  ))}
                </Select>
                {clients.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No hay clientes registrados.{' '}
                    <Link
                      to="/clientes"
                      className="font-semibold underline"
                    >
                      Registrar cliente
                    </Link>
                  </p>
                )}
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

              {selectedClient && (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedClient.nombres} {selectedClient.apellidos}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {selectedClient.documentoIdentidad} ·{' '}
                      {selectedClient.telefono}
                      {selectedClient.correo
                        ? ` · ${selectedClient.correo}`
                        : ''}
                    </p>
                  </div>
                </div>
              )}

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
            description="Solo se muestran equipos con estado Disponible."
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
                  <Button
                    variant="secondary"
                    onClick={() => void loadData()}
                  >
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
              <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                {filteredItems.map((item) => {
                  const selected = selectedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      aria-pressed={selected}
                      className={`relative rounded-2xl border p-4 text-left transition ${
                        selected
                          ? 'border-brand-500 bg-brand-50/50 ring-4 ring-brand-500/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {item.codigoSerie}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                            {item.nombre}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.categoria.nombre}
                          </p>
                        </div>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                            selected
                              ? 'border-brand-500 bg-brand-500 text-ink-900'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </div>
                      <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                        <span className="text-sm font-bold text-slate-900">
                          {formatMoney(item.precioAlquilerDiario)}
                          <span className="ml-1 text-[10px] font-medium text-slate-400">
                            / día
                          </span>
                        </span>
                        <ItemStatusBadge status={item.estado} />
                      </div>
                    </button>
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
                Tarifa diaria · {selectedItems.length}{' '}
                {selectedItems.length === 1 ? 'implemento' : 'implementos'}
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-start gap-2.5 text-sm">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">
                    Devolución pactada
                  </p>
                  <p className="text-xs text-slate-500">
                    {dueDate || 'Seleccione una fecha'}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Implementos
                  </p>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedItems.length}
                  </span>
                </div>
                {selectedItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs leading-5 text-slate-500">
                    Selecciona implementos disponibles del catálogo.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-700">
                            {item.nombre}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {item.codigoSerie} ·{' '}
                            {formatMoney(item.precioAlquilerDiario)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-rose-600"
                          aria-label={`Quitar ${item.nombre}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedClient && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Cliente
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {selectedClient.nombres} {selectedClient.apellidos}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {selectedClient.documentoIdentidad}
                  </p>
                </div>
              )}

              {submitError && <ErrorAlert message={submitError} />}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={submitting}
                disabled={
                  clients.length === 0 || availableItems.length === 0
                }
                icon={<Plus className="h-4 w-4" />}
              >
                Confirmar alquiler
              </Button>
              <p className="text-center text-[10px] leading-4 text-slate-400">
                Al confirmar, los implementos cambiarán a estado{' '}
                {itemStatusLabels.ALQUILADO.toLowerCase()} de manera automática.
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
