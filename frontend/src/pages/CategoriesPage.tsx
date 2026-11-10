import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Boxes,
  Pencil,
  Plus,
  RefreshCw,
  Tags,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Field,
  IconButton,
  TextArea,
  TextInput,
} from '../components/ui/Button';
import { Badge } from '../components/ui/Badges';
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
import type { Category, ListResponse } from '../types';

interface CategoryFormState {
  nombre: string;
  descripcion: string;
}

const emptyForm: CategoryFormState = { nombre: '', descripcion: '' };

export function CategoriesPage() {
  const { success, error: showError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get<ListResponse<Category>>('/categories');
      setCategories(response.data.data);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const openCreate = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      nombre: category.nombre,
      descripcion: category.descripcion ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
    };
    setSaving(true);
    try {
      if (editingCategory) {
        await api.patch(`/categories/${editingCategory.id}`, payload);
        success('Categoría actualizada correctamente.');
      } else {
        await api.post('/categories', payload);
        success('Categoría creada correctamente.');
      }
      setModalOpen(false);
      setEditingCategory(null);
      await loadCategories();
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
      await api.delete(`/categories/${deleteTarget.id}`);
      success('Categoría eliminada correctamente.');
      setDeleteTarget(null);
      await loadCategories();
    } catch (error) {
      showError(getErrorMessage(error));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const totalItems = categories.reduce(
    (sum, category) => sum + (category._count?.implementos ?? 0),
    0,
  );

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Configuración"
        title="Categorías"
        description="Organiza el catálogo de implementos por tipo de equipo o uso en obra."
        actions={
          <>
            <IconButton
              icon={RefreshCw}
              label="Actualizar categorías"
              onClick={() => void loadCategories()}
              variant="secondary"
            />
            <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Nueva categoría
            </Button>
          </>
        }
      />

      {loadError && <ErrorAlert message={loadError} onRetry={loadCategories} />}

      {loading ? (
        <LoadingBlock message="Cargando categorías…" />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Aún no hay categorías"
          description="Crea la primera categoría para poder clasificar los implementos del inventario."
          action={
            <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Crear categoría
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {categories.length}
                </p>
                <p className="text-sm text-slate-500">Categorías activas</p>
              </div>
            </div>
            <div className="card flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
                <p className="text-sm text-slate-500">
                  Implementos clasificados
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <article key={category.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Tags className="h-5 w-5" />
                  </div>
                  <Badge tone="slate">
                    {category._count?.implementos ?? 0}{' '}
                    {(category._count?.implementos ?? 0) === 1
                      ? 'implemento'
                      : 'implementos'}
                  </Badge>
                </div>
                <h2 className="mt-4 text-base font-bold text-slate-900">
                  {category.nombre}
                </h2>
                <p className="mt-1.5 min-h-10 text-sm leading-5 text-slate-500">
                  {category.descripcion || 'Sin descripción.'}
                </p>
                <div className="mt-4 flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                  <IconButton
                    icon={Pencil}
                    label="Editar categoría"
                    onClick={() => openEdit(category)}
                  />
                  <IconButton
                    icon={Trash2}
                    label="Eliminar categoría"
                    variant="danger"
                    onClick={() => setDeleteTarget(category)}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
        description="Utiliza nombres claros para facilitar la búsqueda de implementos."
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="category-form"
              loading={saving}
              icon={<Tags className="h-4 w-4" />}
            >
              {editingCategory ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorAlert message={formError} />}
          <Field
            label="Nombre"
            htmlFor="nombreCategoria"
            required
            hint="Debe ser único. Ej.: Herramientas eléctricas."
          >
            <TextInput
              id="nombreCategoria"
              value={form.nombre}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  nombre: event.target.value,
                }))
              }
              required
              maxLength={100}
              placeholder="Categoría"
            />
          </Field>
          <Field label="Descripción" htmlFor="descripcionCategoria">
            <TextArea
              id="descripcionCategoria"
              value={form.descripcion}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  descripcion: event.target.value,
                }))
              }
              maxLength={250}
              rows={3}
              placeholder="Describe qué tipo de implementos agrupa esta categoría…"
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar categoría"
        description={`¿Confirma que desea eliminar "${deleteTarget?.nombre ?? ''}"? La eliminación fallará si tiene implementos asociados.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
