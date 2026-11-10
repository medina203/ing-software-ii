import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CircleDollarSign,
  Package,
  PackageSearch,
  Pencil,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Field,
  IconButton,
  SearchInput,
  Select,
  TextArea,
  TextInput,
} from '../components/ui/Button';
import { ItemStatusBadge } from '../components/ui/Badges';
import {
  ConfirmDialog,
  EmptyState,
  ErrorAlert,
  LoadingBlock,
  PageHeader,
} from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/Toast';
import api, { getErrorMessage } from '../lib/api';
import { formatMoney, itemStatusLabels } from '../lib/format';
import type {
  Category,
  Item,
  ItemStatus,
  ListResponse,
  PaginatedResponse,
} from '../types';

interface ItemFormState {
  codigoSerie: string;
  nombre: string;
  categoriaId: string;
  descripcion: string;
  precio: string;
  estado: ItemStatus;
}

const emptyForm: ItemFormState = {
  codigoSerie: '',
  nombre: '',
  categoriaId: '',
  descripcion: '',
  precio: '',
  estado: 'DISPONIBLE',
};

const MANUAL_STATES: ItemStatus[] = ['DISPONIBLE', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO'];
const PAGE_SIZE = 9;

export function InventoryPage() {
  const { usuario } = useAuth();
  const { success, error: showError } = useToast();
  const isAdmin = usuario?.rol === 'ADMIN';

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  const requestIdRef = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const [itemsResponse, categoriesResponse] = await Promise.all([
        api.get<PaginatedResponse<Item>>('/items', {
          params: {
            page,
            pageSize: PAGE_SIZE,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(statusFilter !== 'TODOS' ? { estado: statusFilter } : {}),
            ...(categoryFilter !== 'TODAS'
              ? { categoriaId: Number(categoryFilter) }
              : {}),
          },
        }),
        api.get<ListResponse<Category>>('/categories'),
      ]);
      if (requestId !== requestIdRef.current) return;
      setItems(itemsResponse.data.data);
      setTotal(itemsResponse.data.total);
      setTotalPages(Math.max(1, itemsResponse.data.totalPages));
      setCategories(categoriesResponse.data.data);

      if (page > Math.max(1, itemsResponse.data.totalPages)) {
        setPage(Math.max(1, itemsResponse.data.totalPages));
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(getErrorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [categoryFilter, debouncedSearch, page, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setForm({
      codigoSerie: item.codigoSerie,
      nombre: item.nombre,
      categoriaId: String(item.categoriaId),
      descripcion: item.descripcion ?? '',
      precio: item.precioAlquilerDiario,
      estado: item.estado,
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingItem(null);
  };

  const updateField = <K extends keyof ItemFormState>(
    key: K,
    value: ItemFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!form.categoriaId) {
      setFormError('Seleccione una categoría.');
      return;
    }

    const price = Number(form.precio);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Ingrese un precio diario mayor a cero.');
      return;
    }

    const isEditingRented = editingItem?.estado === 'ALQUILADO';
    const payload = {
      codigoSerie: form.codigoSerie.trim(),
      nombre: form.nombre.trim(),
      categoriaId: Number(form.categoriaId),
      descripcion: form.descripcion.trim(),
      precioAlquilerDiario: price,
      ...(isEditingRented ? {} : { estado: form.estado }),
    };

    setSaving(true);
    try {
      if (editingItem) {
        await api.patch(`/items/${editingItem.id}`, payload);
        success('Implemento actualizado correctamente.');
      } else {
        await api.post('/items', payload);
        success('Implemento registrado correctamente.');
      }
      setModalOpen(false);
      setEditingItem(null);
      await loadData();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/items/${deleteTarget.id}`);
      success('Implemento eliminado correctamente.');
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      showError(getErrorMessage(error));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('TODOS');
    setCategoryFilter('TODAS');
    setPage(1);
  };

  const hasFilters =
    Boolean(search) || statusFilter !== 'TODOS' || categoryFilter !== 'TODAS';
  const rented = editingItem?.estado === 'ALQUILADO';

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Catálogo"
        title="Inventario de implementos"
        description="Consulta disponibilidad, estado y tarifas. Solo los implementos disponibles pueden incluirse en un alquiler."
        actions={
          <>
            <IconButton
              icon={RefreshCw}
              label="Actualizar inventario"
              onClick={() => void loadData()}
              variant="secondary"
            />
            {isAdmin && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                Nuevo implemento
              </Button>
            )}
          </>
        }
      />

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, código o categoría…"
            className="flex-1"
            aria-label="Buscar implementos"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="hidden h-4 w-4 text-slate-400 sm:block" />
              <Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                aria-label="Filtrar por estado"
                className="sm:w-48"
              >
                <option value="TODOS">Todos los estados</option>
                {Object.entries(itemStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <Select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filtrar por categoría"
              className="sm:w-52"
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
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Mostrando <span className="font-semibold">{items.length}</span> de {total}{' '}
            implementos
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {loadError && <ErrorAlert message={loadError} onRetry={loadData} />}

      {loading ? (
        <LoadingBlock message="Cargando inventario…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={total === 0 && !hasFilters ? 'Aún no hay implementos' : 'Sin resultados'}
          description={
            total === 0 && !hasFilters
              ? isAdmin
                ? 'Registra el primer implemento para comenzar a gestionar el inventario.'
                : 'El administrador aún no ha registrado implementos.'
              : 'Prueba con otros filtros o limpia la búsqueda para ver todo el inventario.'
          }
          action={
            total === 0 && !hasFilters && isAdmin ? (
              <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                Registrar implemento
              </Button>
            ) : hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-pop"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Package className="h-5 w-5" />
                </div>
                <ItemStatusBadge status={item.estado} />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {item.codigoSerie}
                </p>
                <h3 className="mt-1 text-base font-bold leading-6 text-slate-900">
                  {item.nombre}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-brand-600">
                  {item.categoria.nombre}
                </p>
                <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                  {item.descripcion || 'Sin descripción adicional.'}
                </p>
                <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tarifa diaria
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-lg font-bold text-slate-900">
                      {formatMoney(item.precioAlquilerDiario)}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <IconButton
                        icon={Pencil}
                        label="Editar implemento"
                        onClick={() => openEdit(item)}
                      />
                      <IconButton
                        icon={Trash2}
                        label="Eliminar implemento"
                        variant="danger"
                        onClick={() => setDeleteTarget(item)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
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
      )}

      {!isAdmin && (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <CircleDollarSign className="h-4 w-4 text-slate-400" />
          Como empleado puedes consultar el inventario y su disponibilidad. La gestión de
          implementos está reservada al administrador.
        </p>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingItem ? 'Editar implemento' : 'Nuevo implemento'}
        description={
          editingItem
            ? 'Actualiza los datos del equipo. Los cambios de tarifa aplican a los próximos alquileres.'
            : 'Registra un equipo con su código único, categoría y tarifa diaria.'
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="item-form"
              loading={saving}
              icon={<Package className="h-4 w-4" />}
            >
              {editingItem ? 'Guardar cambios' : 'Registrar implemento'}
            </Button>
          </>
        }
      >
        <form id="item-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorAlert message={formError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Código de serie"
              htmlFor="codigoSerie"
              required
              hint="Ej.: HERR-004. Debe ser único."
            >
              <TextInput
                id="codigoSerie"
                value={form.codigoSerie}
                onChange={(event) => updateField('codigoSerie', event.target.value)}
                required
                maxLength={50}
                placeholder="HERR-004"
              />
            </Field>
            <Field label="Nombre" htmlFor="nombre" required>
              <TextInput
                id="nombre"
                value={form.nombre}
                onChange={(event) => updateField('nombre', event.target.value)}
                required
                maxLength={140}
                placeholder="Taladro percutor 850 W"
              />
            </Field>
            <Field label="Categoría" htmlFor="categoriaId" required>
              <Select
                id="categoriaId"
                value={form.categoriaId}
                onChange={(event) => updateField('categoriaId', event.target.value)}
                required
              >
                <option value="">Seleccione una categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nombre}
                  </option>
                ))}
              </Select>
              {categories.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  Primero crea una categoría en{' '}
                  <Link
                    to="/categorias"
                    className="font-semibold underline"
                    onClick={closeModal}
                  >
                    Categorías
                  </Link>
                  .
                </p>
              )}
            </Field>
            <Field
              label="Tarifa diaria (COP)"
              htmlFor="precio"
              required
              hint="Valor de referencia por día de alquiler."
            >
              <TextInput
                id="precio"
                type="number"
                min="1"
                step="100"
                value={form.precio}
                onChange={(event) => updateField('precio', event.target.value)}
                required
                placeholder="45000"
              />
            </Field>
          </div>

          <Field label="Estado operativo" htmlFor="estado">
            <Select
              id="estado"
              value={form.estado}
              onChange={(event) =>
                updateField('estado', event.target.value as ItemStatus)
              }
              disabled={rented}
            >
              {rented ? (
                <option value="ALQUILADO">Alquilado</option>
              ) : (
                MANUAL_STATES.map((state) => (
                  <option key={state} value={state}>
                    {itemStatusLabels[state]}
                  </option>
                ))
              )}
            </Select>
            <p className="mt-1 text-xs text-slate-500">
              {rented
                ? 'El estado se actualizará automáticamente cuando se registre la devolución.'
                : 'El estado Alquilado solo lo asigna el sistema al crear un alquiler.'}
            </p>
          </Field>

          <Field label="Descripción" htmlFor="descripcion">
            <TextArea
              id="descripcion"
              value={form.descripcion}
              onChange={(event) => updateField('descripcion', event.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Accesorios incluidos, características o condición del equipo…"
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar implemento"
        description={`¿Confirma que desea eliminar "${deleteTarget?.nombre ?? ''}"? Esta acción no se puede deshacer y fallará si el equipo tiene historial de alquileres.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
