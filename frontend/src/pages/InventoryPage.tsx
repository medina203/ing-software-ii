import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CircleDollarSign,
  List,
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
import { ImagePicker } from '../components/ImagePicker';
import { ItemImage } from '../components/ItemImage';
import { ItemUnitsModal } from '../components/ItemUnitsModal';
import { NumericInput } from '../components/ui/NumericInput';
import { assetUrl, defaultItemImage } from '../lib/assets';
import { imageFormData, MULTIPART } from '../lib/image-resize';
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
  ItemGroup,
  ItemGroupsResponse,
  ItemStatus,
  ListResponse,
} from '../types';

interface ItemFormState {
  nombre: string;
  categoriaId: string;
  descripcion: string;
  precio: string;
  estado: ItemStatus;
  cantidad: string;
}

const emptyForm: ItemFormState = {
  nombre: '',
  categoriaId: '',
  descripcion: '',
  precio: '',
  estado: 'DISPONIBLE',
  cantidad: '1',
};

const MANUAL_STATES: ItemStatus[] = ['DISPONIBLE', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO'];
const PAGE_SIZE = 9;

type FormMode = 'create' | 'add' | 'edit';

function priceLabel(group: ItemGroup): string {
  return group.precioMin === group.precioMax
    ? formatMoney(group.precioMin)
    : `${formatMoney(group.precioMin)} – ${formatMoney(group.precioMax)}`;
}

/** Barra de stock: proporción de unidades por estado. */
function StockBar({ group }: { group: ItemGroup }) {
  const segments = [
    { value: group.disponibles, className: 'bg-emerald-500' },
    { value: group.alquilados, className: 'bg-sky-500' },
    { value: group.mantenimiento, className: 'bg-amber-400' },
    { value: group.fueraDeServicio, className: 'bg-slate-400' },
  ];
  return (
    <div
      className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100"
      aria-hidden
    >
      {segments.map((segment, index) =>
        segment.value > 0 ? (
          <div
            key={index}
            className={segment.className}
            style={{ width: `${(segment.value / Math.max(1, group.total)) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

export function InventoryPage() {
  const { usuario } = useAuth();
  const { success, error: showError } = useToast();
  const isAdmin = usuario?.rol === 'ADMIN';

  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);
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
  const [mode, setMode] = useState<FormMode>('create');
  const [targetGroup, setTargetGroup] = useState<ItemGroup | null>(null);
  const [unitsGroup, setUnitsGroup] = useState<ItemGroup | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageGroup, setImageGroup] = useState<ItemGroup | null>(null);
  const [imageSaving, setImageSaving] = useState(false);
  const [imageError, setImageError] = useState('');
  const [form, setForm] = useState<ItemFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ItemGroup | null>(null);
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
        api.get<ItemGroupsResponse>('/items/groups', {
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
      setGroups(itemsResponse.data.data);
      setTotal(itemsResponse.data.total);
      setTotalUnits(itemsResponse.data.totalUnidades);
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
    setImageFile(null);
    setMode('create');
    setTargetGroup(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const groupForm = (group: ItemGroup): ItemFormState => ({
    nombre: group.nombre,
    categoriaId: String(group.categoriaId),
    descripcion: group.descripcion ?? '',
    precio: group.precioMax,
    estado: 'DISPONIBLE',
    cantidad: '1',
  });

  const openEdit = (group: ItemGroup) => {
    setImageFile(null);
    setMode('edit');
    setTargetGroup(group);
    setForm(groupForm(group));
    setFormError('');
    setModalOpen(true);
  };

  const openAddUnits = (group: ItemGroup) => {
    setMode('add');
    setTargetGroup(group);
    setForm(groupForm(group));
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setTargetGroup(null);
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

    const quantity = Number(form.cantidad);
    if (
      mode !== 'edit' &&
      (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    ) {
      setFormError('Ingrese una cantidad entre 1 y 100 unidades.');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'edit' && targetGroup) {
        await api.patch('/items/group', {
          categoriaId: targetGroup.categoriaId,
          nombre: targetGroup.nombre,
          nuevoNombre: form.nombre.trim(),
          descripcion: form.descripcion.trim(),
          precioAlquilerDiario: price,
        });
        success(`"${form.nombre.trim()}" actualizado en todas sus unidades.`);
      } else {
        const response = await api.post<{
          total: number;
          items: Array<{ nombre: string }>;
        }>('/items/batch', {
          nombre: form.nombre.trim(),
          categoriaId: Number(form.categoriaId),
          descripcion: form.descripcion.trim(),
          precioAlquilerDiario: price,
          estado: form.estado,
          cantidad: quantity,
        });
        const created = response.data.total;

        if (imageFile && mode === 'create') {
          try {
            await api.post(
              '/items/group/image',
              await imageFormData(imageFile, {
                categoriaId: Number(form.categoriaId),
                nombre: response.data.items[0]?.nombre ?? form.nombre.trim(),
              }),
              MULTIPART,
            );
          } catch (error) {
            showError(
              `Se registró el implemento, pero la imagen no se guardó: ${getErrorMessage(error)}`,
            );
          }
        }

        if (mode === 'add') {
          success(
            created === 1
              ? 'Unidad agregada correctamente.'
              : `${created} unidades agregadas correctamente.`,
          );
        } else {
          success(
            created === 1
              ? 'Implemento registrado correctamente.'
              : `${created} implementos registrados correctamente.`,
          );
        }
      }
      setModalOpen(false);
      setTargetGroup(null);
      await loadData();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const saveImage = async (reset: boolean) => {
    if (!imageGroup) return;
    setImageSaving(true);
    setImageError('');
    try {
      if (reset) {
        await api.delete('/items/group/image', {
          params: { categoriaId: imageGroup.categoriaId, nombre: imageGroup.nombre },
        });
        success('Se restableció la ilustración del implemento.');
      } else if (imageFile) {
        await api.post(
          '/items/group/image',
          await imageFormData(imageFile, {
            categoriaId: imageGroup.categoriaId,
            nombre: imageGroup.nombre,
          }),
          MULTIPART,
        );
        success('Imagen actualizada.');
      }
      setImageGroup(null);
      setImageFile(null);
      await loadData();
    } catch (error) {
      setImageError(getErrorMessage(error));
    } finally {
      setImageSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await api.delete<{ message: string }>('/items/group', {
        params: { categoriaId: deleteTarget.categoriaId, nombre: deleteTarget.nombre },
      });
      success(response.data.message);
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
  const quantity = Math.max(1, Math.trunc(Number(form.cantidad) || 1));
  const selectedCategory = categories.find(
    (category) => category.id === Number(form.categoriaId),
  );
  const serialPreview = selectedCategory
    ? `${selectedCategory.prefijo}-${String(
        selectedCategory.ultimoConsecutivo + 1,
      ).padStart(3, '0')}`
    : '';

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Catálogo"
        title="Inventario de implementos"
        description="Cada implemento aparece una sola vez con su stock. Solo las unidades disponibles pueden incluirse en un alquiler."
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
            Mostrando <span className="font-semibold">{groups.length}</span> de {total}{' '}
            {total === 1 ? 'implemento' : 'implementos'} ·{' '}
            <span className="font-semibold">{totalUnits}</span>{' '}
            {totalUnits === 1 ? 'unidad' : 'unidades'} en total
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
      ) : groups.length === 0 ? (
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
          {groups.map((group) => {
            const hasStock = group.disponibles > 0;
            const others = [
              { label: 'Alquiladas', value: group.alquilados, dot: 'bg-sky-500' },
              { label: 'Mantenimiento', value: group.mantenimiento, dot: 'bg-amber-400' },
              {
                label: 'Fuera de servicio',
                value: group.fueraDeServicio,
                dot: 'bg-slate-400',
              },
            ];
            return (
              <article
                key={`${group.categoriaId}-${group.nombre}`}
                data-testid="item-group-card"
                aria-label={group.nombre}
                className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-pop"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                  <ItemImage
                    nombre={group.nombre}
                    categoria={group.categoria.nombre}
                    imagenUrl={group.imagenUrl}
                    className="transition duration-300 group-hover:scale-[1.04]"
                  />
                  <span
                    className={
                      hasStock
                        ? 'absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-white shadow-md'
                        : 'absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-white shadow-md'
                    }
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    {hasStock ? 'Con stock' : 'Sin stock'}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImageError('');
                        setImageGroup(group);
                      }}
                      aria-label={`Cambiar imagen de ${group.nombre}`}
                      title="Cambiar imagen"
                      className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-base font-bold leading-6 text-slate-900">
                    {group.nombre}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-brand-600">
                    {group.categoria.nombre}
                    <span className="ml-1.5 font-mono text-slate-400">
                      {group.categoria.prefijo}
                    </span>
                  </p>
                  <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                    {group.descripcion || 'Sin descripción adicional.'}
                  </p>

                  <div className="mt-4 space-y-2.5 rounded-xl bg-slate-50 p-3.5">
                    <div className="flex items-baseline justify-between">
                      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                        Stock disponible
                      </p>
                      <p
                        className="text-sm text-slate-500"
                        data-testid="item-group-stock"
                      >
                        <span className="text-xl font-bold text-slate-900">
                          {group.disponibles}
                        </span>{' '}
                        de {group.total} {group.total === 1 ? 'unidad' : 'unidades'}
                      </p>
                    </div>
                    <StockBar group={group} />
                    {others.some((item) => item.value > 0) && (
                      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-slate-500">
                        {others
                          .filter((item) => item.value > 0)
                          .map((item) => (
                            <li key={item.label} className="flex items-center gap-1">
                              <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
                              {item.label}:{' '}
                              <span className="font-semibold">{item.value}</span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                        Tarifa diaria
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {priceLabel(group)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        icon={List}
                        label={`Ver unidades de ${group.nombre}`}
                        onClick={() => setUnitsGroup(group)}
                      />
                      {isAdmin && (
                        <>
                          <IconButton
                            icon={Plus}
                            label={`Agregar unidades de ${group.nombre}`}
                            onClick={() => openAddUnits(group)}
                          />
                          <IconButton
                            icon={Pencil}
                            label={`Editar ${group.nombre}`}
                            onClick={() => openEdit(group)}
                          />
                          <IconButton
                            icon={Trash2}
                            label={`Eliminar ${group.nombre}`}
                            variant="danger"
                            onClick={() => setDeleteTarget(group)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            Página {page} de {totalPages} · {total}{' '}
            {total === 1 ? 'implemento' : 'implementos'}
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
        title={
          mode === 'edit'
            ? 'Editar implemento'
            : mode === 'add'
              ? 'Agregar unidades'
              : 'Nuevo implemento'
        }
        description={
          mode === 'edit'
            ? `Los cambios se aplican a las ${targetGroup?.total ?? 0} unidades. La tarifa nueva rige para los próximos alquileres.`
            : mode === 'add'
              ? `Suma unidades al stock de "${targetGroup?.nombre ?? ''}" con seriales consecutivos.`
              : 'Registra uno o varios equipos iguales. Si el nombre ya existe en la categoría, las unidades se suman a su stock.'
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
              icon={
                mode === 'add' ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Package className="h-4 w-4" />
                )
              }
            >
              {mode === 'edit'
                ? 'Guardar cambios'
                : mode === 'add'
                  ? 'Agregar unidades'
                  : 'Registrar implemento'}
            </Button>
          </>
        }
      >
        <form id="item-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorAlert message={formError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            {mode !== 'edit' && (
              <Field
                label="Código de serie"
                htmlFor="codigoSerie"
                hint={
                  selectedCategory && quantity > 1
                    ? `Se generarán ${quantity} seriales consecutivos desde ${serialPreview}.`
                    : 'Vista previa. El serial definitivo se genera automáticamente al guardar.'
                }
              >
                <TextInput
                  id="codigoSerie"
                  value={serialPreview}
                  readOnly
                  aria-readonly="true"
                  className="bg-slate-50 font-mono text-slate-600"
                  placeholder="Seleccione una categoría"
                />
              </Field>
            )}
            <Field label="Nombre" htmlFor="nombre" required>
              <TextInput
                id="nombre"
                value={form.nombre}
                onChange={(event) => updateField('nombre', event.target.value)}
                readOnly={mode === 'add'}
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
                disabled={mode !== 'create'}
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
              <NumericInput
                id="precio"
                value={form.precio}
                onValueChange={(value) => updateField('precio', value)}
                maxDigits={9}
                required
                placeholder="45000"
              />
            </Field>
          </div>

          {mode !== 'edit' && (
            <Field
              label="Cantidad de unidades"
              htmlFor="cantidad"
              required
              hint={
                quantity > 1
                  ? `Se crearán ${quantity} unidades con seriales consecutivos.`
                  : 'Puedes registrar varias unidades iguales en una sola operación.'
              }
            >
              <NumericInput
                id="cantidad"
                value={form.cantidad}
                onValueChange={(value) => updateField('cantidad', value)}
                maxDigits={3}
                required
              />
            </Field>
          )}

          {mode !== 'edit' && (
            <Field
              label="Estado inicial de las unidades"
              htmlFor="estado"
              hint="El estado de cada unidad se cambia luego desde Ver unidades."
            >
              <Select
                id="estado"
                value={form.estado}
                onChange={(event) =>
                  updateField('estado', event.target.value as ItemStatus)
                }
              >
                {MANUAL_STATES.map((state) => (
                  <option key={state} value={state}>
                    {itemStatusLabels[state]}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {mode === 'create' && (
            <ImagePicker
              label="Imagen (opcional)"
              file={imageFile}
              onFileChange={setImageFile}
              currentUrl={
                form.nombre.trim()
                  ? defaultItemImage(form.nombre, selectedCategory?.nombre).src
                  : undefined
              }
              hint="Si no subes una, se usa una ilustración según el tipo. Desde el celular puedes tomar una foto."
            />
          )}

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
        description={`¿Eliminar "${deleteTarget?.nombre ?? ''}" y sus ${deleteTarget?.total ?? 0} unidades? Solo es posible si ninguna ha sido alquilada; para retirar unidades con historial, cámbialas a Fuera de servicio en Ver unidades.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />

      <Modal
        open={Boolean(imageGroup)}
        onClose={() => !imageSaving && setImageGroup(null)}
        title="Imagen del implemento"
        description={
          imageGroup
            ? `Se muestra en la tarjeta de "${imageGroup.nombre}" y la comparten sus ${imageGroup.total} unidades.`
            : undefined
        }
        footer={
          <>
            {imageGroup?.imagenUrl && (
              <Button
                variant="secondary"
                disabled={imageSaving}
                onClick={() => void saveImage(true)}
              >
                Usar ilustración
              </Button>
            )}
            <Button
              loading={imageSaving}
              disabled={!imageFile}
              onClick={() => void saveImage(false)}
              icon={<Camera className="h-4 w-4" />}
            >
              Guardar imagen
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {imageError && <ErrorAlert message={imageError} />}
          {imageGroup && (
            <ImagePicker
              label="Nueva imagen"
              file={imageFile}
              onFileChange={setImageFile}
              currentUrl={
                assetUrl(imageGroup.imagenUrl) ??
                defaultItemImage(imageGroup.nombre, imageGroup.categoria.nombre).src
              }
            />
          )}
        </div>
      </Modal>

      <ItemUnitsModal
        group={unitsGroup}
        isAdmin={isAdmin}
        onClose={() => setUnitsGroup(null)}
        onChanged={() => void loadData()}
      />
    </div>
  );
}
