import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
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
  Select,
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
import { NumericInput } from '../components/ui/NumericInput';
import {
  buildDocument,
  DOCUMENT_TYPES,
  documentRule,
  parseDocument,
  validateDocument,
  validatePhone,
  type DocumentType,
} from '../lib/document';
import type { Client, ListResponse } from '../types';

interface ClientFormState {
  docTipo: DocumentType;
  docNumero: string;
  docDv: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  direccion: string;
}

const emptyForm: ClientFormState = {
  docTipo: 'CC',
  docNumero: '',
  docDv: '',
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
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const requestIdRef = useRef(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadClients = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get<ListResponse<Client>>('/clients', {
        params: debouncedSearch ? { search: debouncedSearch } : {},
      });
      if (requestId !== requestIdRef.current) return;
      setClients(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(getErrorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    const documento = parseDocument(client.documentoIdentidad);
    setForm({
      docTipo: documento.tipo,
      docNumero: documento.numero,
      docDv: documento.dv,
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

    const documento = { tipo: form.docTipo, numero: form.docNumero, dv: form.docDv };
    const validation = validateDocument(documento) || validatePhone(form.telefono);
    if (validation) {
      setFormError(validation);
      return;
    }

    const payload = {
      documentoIdentidad: buildDocument(documento),
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
              <strong className="text-slate-800">{total}</strong>{' '}
              {total === 1 ? 'cliente' : 'clientes'}
              {debouncedSearch ? ' · búsqueda en servidor' : ''}
            </span>
          </div>
        </div>
      </div>

      {loadError && <ErrorAlert message={loadError} onRetry={loadClients} />}

      {loading ? (
        <LoadingBlock message="Cargando clientes…" />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={debouncedSearch ? 'Sin resultados' : 'Aún no hay clientes'}
          description={
            debouncedSearch
              ? 'No encontramos clientes con el término de búsqueda ingresado.'
              : 'Registra el primer cliente para poder crear alquileres.'
          }
          action={
            debouncedSearch ? (
              <Button variant="secondary" onClick={() => setSearch('')}>
                Limpiar búsqueda
              </Button>
            ) : (
              <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                Registrar cliente
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
                {clients.map((client) => (
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
                          <p className="text-xs text-slate-400">Cliente #{client.id}</p>
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
            <Field label="Tipo de documento" htmlFor="docTipo" required>
              <Select
                id="docTipo"
                value={form.docTipo}
                onChange={(event) => {
                  const tipo = event.target.value as DocumentType;
                  setForm((current) => ({
                    ...current,
                    docTipo: tipo,
                    docNumero: current.docNumero.slice(0, documentRule(tipo).max),
                    docDv: tipo === 'NIT' ? current.docDv : '',
                  }));
                }}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.value} · {type.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Número de documento"
              htmlFor="documento"
              required
              hint={
                form.docTipo === 'NIT'
                  ? '9 dígitos y el dígito de verificación.'
                  : `Solo números, entre ${documentRule(form.docTipo).min} y ${documentRule(form.docTipo).max} dígitos.`
              }
            >
              <div className="flex items-center gap-2">
                <NumericInput
                  id="documento"
                  value={form.docNumero}
                  onValueChange={(value) => updateField('docNumero', value)}
                  maxDigits={documentRule(form.docTipo).max}
                  required
                  placeholder={form.docTipo === 'NIT' ? '900123456' : '10324567'}
                />
                {form.docTipo === 'NIT' && (
                  <>
                    <span className="text-slate-400">-</span>
                    <NumericInput
                      id="documentoDv"
                      aria-label="Dígito de verificación"
                      value={form.docDv}
                      onValueChange={(value) => updateField('docDv', value)}
                      maxDigits={1}
                      required
                      className="w-14 text-center"
                      placeholder="7"
                    />
                  </>
                )}
              </div>
            </Field>
            <Field
              label="Teléfono"
              htmlFor="telefono"
              required
              hint="Solo números, entre 7 y 10 dígitos."
            >
              <NumericInput
                id="telefono"
                autoComplete="tel"
                value={form.telefono}
                onValueChange={(value) => updateField('telefono', value)}
                maxDigits={10}
                required
                placeholder="3105551234"
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
                onChange={(event) => updateField('apellidos', event.target.value)}
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
              onChange={(event) => updateField('direccion', event.target.value)}
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
