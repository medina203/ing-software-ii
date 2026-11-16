import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Minus,
  PackageOpen,
  Plus,
  RefreshCw,
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
import { ClientSearchSelect } from '../components/ClientSearchSelect';
import { useToast } from '../components/Toast';
import api, { getErrorMessage } from '../lib/api';
import { formatMoney, itemStatusLabels } from '../lib/format';
import {
  countSelectedInGroup,
  groupAvailableItems,
  selectedGroups,
  selectedItemsFromGroups,
  setGroupQuantity,
  type AvailableItemGroup,
} from '../lib/rental-selection';
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

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

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

  const categories = useMemo(() => {
    const map = new Map<number, string>();
    availableItems.forEach((item) => map.set(item.categoria.id, item.categoria.nombre));
    return [...map.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [availableItems]);

  const groups = useMemo(() => groupAvailableItems(availableItems), [availableItems]);

  const filteredGroups = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();

    return groups.filter((group) => {
      const matchesCategory =
        categoryFilter === 'TODAS' || group.categoriaId === Number(categoryFilter);
      const matchesTerm =
        !term ||
        group.nombre.toLowerCase().includes(term) ||
        group.categoriaNombre.toLowerCase().includes(term) ||
        group.items.some((item) => item.codigoSerie.toLowerCase().includes(term));

      return matchesCategory && matchesTerm;
    });
  }, [groups, itemSearch, categoryFilter]);

  const selectedItems = useMemo(
    () => selectedItemsFromGroups(groups, selectedIds),
    [groups, selectedIds],
  );
  const selectedGroupsSummary = useMemo(
    () => selectedGroups(groups, selectedIds),
    [groups, selectedIds],
  );
  const dailyTotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.precioAlquilerDiario),
    0,
  );

  const updateGroupQuantity = (group: AvailableItemGroup, quantity: number) => {
    const available = group.items.length;

    if (quantity > available) {
      setQuantityErrors((current) => ({
        ...current,
        [group.key]: `Solo hay ${available} ${
          available === 1 ? 'unidad disponible' : 'unidades disponibles'
        } de este tipo.`,
      }));
    } else {
      setQuantityErrors((current) => {
        if (!current[group.key]) return current;
        const next = { ...current };
        delete next[group.key];
        return next;
      });
    }

    setSelectedIds((current) => setGroupQuantity(group, current, quantity));
  };

  const incrementGroup = (group: AvailableItemGroup) => {
    const current = countSelectedInGroup(group, selectedIds);
    if (current >= group.items.length) return;
    updateGroupQuantity(group, current + 1);
  };

  const decrementGroup = (group: AvailableItemGroup) => {
    const current = countSelectedInGroup(group, selectedIds);
    if (current <= 0) return;
    updateGroupQuantity(group, current - 1);
  };

  const clearGroup = (group: AvailableItemGroup) => {
    setSelectedIds((current) => setGroupQuantity(group, current, 0));
    setQuantityErrors((current) => {
      if (!current[group.key]) return current;
      const next = { ...current };
      delete next[group.key];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    if (!selectedClient) {
      setSubmitError('Seleccione un cliente para el alquiler.');
      return;
    }
    if (selectedItems.length === 0) {
      setSubmitError('Seleccione al menos una unidad disponible.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ id: number }>('/rentals', {
        clienteId: selectedClient.id,
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
        description="Selecciona el cliente, la fecha de devolución y las unidades disponibles. Puedes indicar la cantidad por tipo de implemento; el inventario se bloqueará de forma atómica al confirmar."
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
            description="Solo se muestran equipos con estado Disponible. Agrupa por tipo y ajusta la cantidad que necesitas."
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
            ) : filteredGroups.length === 0 ? (
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
                {filteredGroups.map((group) => {
                  const selectedCount = countSelectedInGroup(group, selectedIds);

                  return (
                    <div
                      key={group.key}
                      className={`rounded-2xl border p-4 transition ${
                        selectedCount > 0
                          ? 'border-brand-500 bg-brand-50/40 ring-4 ring-brand-500/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {group.nombre}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {group.categoriaNombre}
                          </p>
                          <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {group.items.length}{' '}
                            {group.items.length === 1
                              ? 'unidad disponible'
                              : 'unidades disponibles'}
                          </p>
                        </div>
                        <span
                          className={`inline-flex min-w-[3rem] items-center justify-center rounded-lg px-2 py-1 text-xs font-bold ${
                            selectedCount > 0
                              ? 'bg-brand-500 text-ink-900'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {selectedCount}/{group.items.length}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <span className="text-sm font-bold text-slate-900">
                          {formatMoney(group.precioUnitario)}
                          <span className="ml-1 text-[10px] font-medium text-slate-400">
                            / día
                          </span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => decrementGroup(group)}
                            disabled={selectedCount === 0}
                            aria-label={`Quitar una unidad de ${group.nombre}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={group.items.length}
                            value={selectedCount}
                            onChange={(event) =>
                              updateGroupQuantity(group, Number(event.target.value))
                            }
                            aria-label={`Cantidad de ${group.nombre}`}
                            className="h-8 w-12 rounded-lg border border-slate-200 bg-white text-center text-sm font-bold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                          <button
                            type="button"
                            onClick={() => incrementGroup(group)}
                            disabled={selectedCount >= group.items.length}
                            aria-label={`Agregar una unidad de ${group.nombre}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {selectedCount > 0 && (
                        <p className="mt-2 break-words font-mono text-[10px] leading-4 text-slate-500">
                          {group.items
                            .filter((item) => selectedIds.has(item.id))
                            .map((item) => item.codigoSerie)
                            .join(', ')}
                        </p>
                      )}

                      {quantityErrors[group.key] && (
                        <p className="mt-2 text-xs font-medium text-rose-600">
                          {quantityErrors[group.key]}
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
                Tarifa diaria · {selectedItems.length}{' '}
                {selectedItems.length === 1 ? 'unidad' : 'unidades'}
                {selectedGroupsSummary.length > 0 &&
                  ` · ${selectedGroupsSummary.length} ${
                    selectedGroupsSummary.length === 1 ? 'tipo' : 'tipos'
                  }`}
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
                    {selectedItems.length}
                  </span>
                </div>
                {selectedItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs leading-5 text-slate-500">
                    Selecciona unidades disponibles del catálogo.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedGroupsSummary.map((group) => (
                      <li
                        key={group.key}
                        className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-700">
                            {group.nombre}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {group.cantidad}{' '}
                            {group.cantidad === 1 ? 'unidad' : 'unidades'} ·{' '}
                            {formatMoney(group.precioUnitario)} c/u
                          </p>
                          <p className="mt-1 break-words font-mono text-[10px] leading-4 text-slate-400">
                            {group.selectedItems
                              .map((item) => item.codigoSerie)
                              .join(', ')}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-600">
                            Subtotal diario: {formatMoney(group.subtotal)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => clearGroup(group)}
                          className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-rose-600"
                          aria-label={`Quitar ${group.nombre}`}
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
                  !selectedClient ||
                  availableItems.length === 0 ||
                  selectedItems.length === 0
                }
                icon={<Plus className="h-4 w-4" />}
              >
                Confirmar alquiler
              </Button>
              <p className="text-center text-[10px] leading-4 text-slate-400">
                Al confirmar, las unidades seleccionadas cambiarán a estado{' '}
                {itemStatusLabels.ALQUILADO.toLowerCase()} de manera automática.
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
