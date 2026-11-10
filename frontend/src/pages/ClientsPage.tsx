import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Field,
  IconButton,
  SearchInput,
  TextArea,
  TextInput,
} from '../components/ui/Button';
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
import type { Client, ListResponse } from '../types';

interface ClientFormState {
  documentoIdentidad: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  direccion: string;
}

const emptyForm: ClientFormState = {
  documentoIdentidad: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  correo: '',
  direccion: '',
};

export function ClientsPage() {
  const { usuario } = useAuth();
  const { success, error: showError } = useToast();
  const isAdmin = usuario?.rol === 'ADMIN';

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get<ListResponse<Client>>('/clients');
      setClients(response.data.data);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) =>
      [
        client.documentoIdentidad,
        client.nombres,
        client.apellidos,
        client.telefono,
        client.correo ?? '',
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }, [clients, search]);

  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      documentoIdentidad: client.documentoIdentidad,
      nombres: client.nombres,
      apellidos: client.apellidos,
      telefono: client.telefono,
      correo: client.correo ?? '',
      direccion: client.direccion ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingClient(null);
  };

  const updateField = <K extends keyof ClientFormState>(
    key: K,
    value: ClientFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    const payload = {
      documentoIdentidad: form.documentoIdentidad.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono.trim(),
      ...(form.correo.trim() ? { correo: form.correo.trim() } : {}),
      ...(form.direccion.trim() ? { direccion: form.direccion.trim() } : {}),
    };

    setSaving(true);
    try {
      if (editingClient) {
        await api.patch(`/clients/${editingClient.id}`, payload);
        success('Cliente actualizado correctamente.');
      } else {
        await api.post('/clients', payload);
        success('Cliente registrado correctamente.');
      }
      setModalOpen(false);
      setEditingClient(null);
      await loadClients();
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
      await api.delete(`/clients/${deleteTarget.id}`);
      success('Cliente eliminado correctamente.');
      setDeleteTarget(null);
      await loadClients();
    } catch (error) {
      showError(getErrorMessage(error));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Directorio"
        title="Clientes"
        description="Registra y consulta los datos de contacto de las personas o empresas que alquilan implementos."
        actions={
          <>
            <IconButton
              icon={RefreshCw}
              label="Actualizar clientes"
              onClick={() => void loadClients()}
              variant="secondary"
            />
            <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Nuevo cliente
            </Button>
          </>
        }
      />

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por documento, nombre, teléfono o correo…"
            className="w-full sm:max-w-xl"
            aria-label="Buscar clientes"
          />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="h-4 w-4" />
            <span>
              <strong className="text-slate-800">{filteredClients.length}</strong>{' '}
              de {clients.length} clientes
            </span>
          </div>
        </div>
      </div>

      {loadError && <ErrorAlert message={loadError} onRetry={loadClients} />}

      {loading ? (
        <LoadingBlock message="Cargando clientes…" />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={clients.length === 0 ? 'Aún no hay clientes' : 'Sin resultados'}
          description={
            clients.length === 0
              ? 'Registra el primer cliente para poder crear alquileres.'
              : 'No encontramos clientes con el término de búsqueda ingresado.'
          }
          action={
            clients.length === 0 ? (
              <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                Registrar cliente
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setSearch('')}>
                Limpiar búsqueda
              </Button>
            )
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="table-th">Cliente</th>
                  <th className="table-th">Documento</th>
                  <th className="table-th">Contacto</th>
                  <th className="table-th">Dirección</th>
                  <th className="table-th text-center">Alquileres</th>
                  <th className="table-th text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/60">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {client.nombres.charAt(0)}
                          {client.apellidos.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {client.nombres} {client.apellidos}
                          </p>
                          <p className="text-xs text-slate-400">
                            Cliente #{client.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td font-mono text-xs">
                      {client.documentoIdentidad}
                    </td>
                    <td className="table-td">
                      <a
                        href={`tel:${client.telefono}`}
                        className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600"
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {client.telefono}
                      </a>
                      {client.correo && (
                        <a
                          href={`mailto:${client.correo}`}
                          className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600"
                        >
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {client.correo}
                        </a>
                      )}
                    </td>
                    <td className="table-td max-w-[220px] truncate text-sm">
                      {client.direccion || '—'}
                    </td>
                    <td className="table-td text-center">
                      <span className="inline-flex min-w-7 items-center justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {client._count?.alquileres ?? 0}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        <IconButton
                          icon={Pencil}
                          label="Editar cliente"
                          onClick={() => openEdit(client)}
                        />
                        {isAdmin && (
                          <IconButton
                            icon={Trash2}
                            label="Eliminar cliente"
                            variant="danger"
                            onClick={() => setDeleteTarget(client)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingClient ? 'Editar cliente' : 'Nuevo cliente'}
        description={
          editingClient
            ? 'Actualiza los datos de contacto del cliente.'
            : 'Completa los datos básicos. El documento de identidad debe ser único.'
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="client-form"
              loading={saving}
              icon={<Users className="h-4 w-4" />}
            >
              {editingClient ? 'Guardar cambios' : 'Registrar cliente'}
            </Button>
          </>
        }
      >
        <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorAlert message={formError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Documento de identidad" htmlFor="documento" required>
              <TextInput
                id="documento"
                value={form.documentoIdentidad}
                onChange={(event) =>
                  updateField('documentoIdentidad', event.target.value)
                }
                required
                maxLength={30}
                placeholder="CC-10324567 o NIT"
              />
            </Field>
            <Field label="Teléfono" htmlFor="telefono" required>
              <TextInput
                id="telefono"
                type="tel"
                value={form.telefono}
                onChange={(event) =>
                  updateField('telefono', event.target.value)
                }
                required
                minLength={7}
                maxLength={30}
                placeholder="310 555 1234"
              />
            </Field>
            <Field label="Nombres" htmlFor="nombres" required>
              <TextInput
                id="nombres"
                value={form.nombres}
                onChange={(event) => updateField('nombres', event.target.value)}
                required
                maxLength={100}
                placeholder="Carlos Andrés"
              />
            </Field>
            <Field label="Apellidos / razón social" htmlFor="apellidos" required>
              <TextInput
                id="apellidos"
                value={form.apellidos}
                onChange={(event) =>
                  updateField('apellidos', event.target.value)
                }
                required
                maxLength={100}
                placeholder="Gómez Ruiz"
              />
            </Field>
          </div>
          <Field label="Correo electrónico" htmlFor="correo">
            <TextInput
              id="correo"
              type="email"
              value={form.correo}
              onChange={(event) => updateField('correo', event.target.value)}
              maxLength={160}
              placeholder="cliente@correo.com"
            />
          </Field>
          <Field label="Dirección" htmlFor="direccion">
            <TextArea
              id="direccion"
              value={form.direccion}
              onChange={(event) =>
                updateField('direccion', event.target.value)
              }
              maxLength={220}
              rows={2}
              placeholder="Calle, número, ciudad…"
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar cliente"
        description={`¿Confirma que desea eliminar a "${deleteTarget?.nombres ?? ''} ${deleteTarget?.apellidos ?? ''}"? No será posible si el cliente tiene alquileres registrados.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
