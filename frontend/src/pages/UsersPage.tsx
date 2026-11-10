import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserX,
  Users,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Field,
  IconButton,
  SearchInput,
  Select,
  TextInput,
} from '../components/ui/Button';
import {
  ActiveBadge,
  RoleBadge,
} from '../components/ui/Badges';
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
import { formatDate } from '../lib/format';
import type { ListResponse, User, UserRole } from '../types';

interface UserFormState {
  nombre: string;
  email: string;
  rol: UserRole;
  password: string;
  activo: boolean;
}

const emptyForm: UserFormState = {
  nombre: '',
  email: '',
  rol: 'EMPLEADO',
  password: '',
  activo: true,
};

export function UsersPage() {
  const { usuario: currentUser } = useAuth();
  const { success, error: showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('TODOS');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);
  const [toggling, setToggling] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get<ListResponse<User>>('/users');
      setUsers(response.data.data);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesTerm =
        !term ||
        user.nombre.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === 'TODOS' || user.rol === roleFilter;
      return matchesTerm && matchesRole;
    });
  }, [users, search, roleFilter]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowPassword(false);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      password: '',
      activo: user.activo,
    });
    setShowPassword(false);
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!editingUser && form.password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (editingUser && form.password && form.password.length < 8) {
      setFormError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      rol: form.rol,
      activo: form.activo,
      ...(form.password ? { password: form.password } : {}),
    };

    setSaving(true);
    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, payload);
        success('Usuario actualizado correctamente.');
      } else {
        await api.post('/users', payload);
        success('Usuario creado correctamente.');
      }
      setModalOpen(false);
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await api.patch(`/users/${toggleTarget.id}`, {
        activo: !toggleTarget.activo,
      });
      success(
        toggleTarget.activo
          ? 'Usuario desactivado. Ya no podrá iniciar sesión.'
          : 'Usuario activado correctamente.',
      );
      setToggleTarget(null);
      await loadUsers();
    } catch (error) {
      showError(getErrorMessage(error));
      setToggleTarget(null);
    } finally {
      setToggling(false);
    }
  };

  const activeAdmins = users.filter(
    (user) => user.rol === 'ADMIN' && user.activo,
  ).length;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Configuración"
        title="Usuarios"
        description="Administra las cuentas del personal, sus roles y el acceso al sistema."
        actions={
          <>
            <IconButton
              icon={RefreshCw}
              label="Actualizar usuarios"
              onClick={() => void loadUsers()}
              variant="secondary"
            />
            <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Nuevo usuario
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
            <p className="text-sm text-slate-500">Usuarios registrados</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {users.filter((user) => user.activo).length}
            </p>
            <p className="text-sm text-slate-500">Cuentas activas</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{activeAdmins}</p>
            <p className="text-sm text-slate-500">Administradores activos</p>
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o correo…"
            className="flex-1"
            aria-label="Buscar usuarios"
          />
          <Select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filtrar por rol"
            className="sm:w-52"
          >
            <option value="TODOS">Todos los roles</option>
            <option value="ADMIN">Administrador</option>
            <option value="EMPLEADO">Empleado</option>
          </Select>
        </div>
      </div>

      {loadError && <ErrorAlert message={loadError} onRetry={loadUsers} />}

      {loading ? (
        <LoadingBlock message="Cargando usuarios…" />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Sin usuarios"
          description="No hay usuarios que coincidan con los filtros seleccionados."
          action={
            search || roleFilter !== 'TODOS' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('TODOS');
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="table-th">Usuario</th>
                  <th className="table-th">Rol</th>
                  <th className="table-th">Estado</th>
                  <th className="table-th">Fecha de alta</th>
                  <th className="table-th text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {user.nombre.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {user.nombre}{' '}
                              {isSelf && (
                                <span className="ml-1 text-[10px] font-semibold text-brand-600">
                                  (tú)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <RoleBadge role={user.rol} />
                      </td>
                      <td className="table-td">
                        <ActiveBadge active={user.activo} />
                      </td>
                      <td className="table-td">
                        {user.createdAt
                          ? formatDate(user.createdAt)
                          : '—'}
                      </td>
                      <td className="table-td">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            icon={Pencil}
                            label="Editar usuario"
                            onClick={() => openEdit(user)}
                          />
                          <IconButton
                            icon={user.activo ? UserX : UserCheck}
                            label={
                              user.activo
                                ? 'Desactivar usuario'
                                : 'Activar usuario'
                            }
                            variant={user.activo ? 'danger' : 'secondary'}
                            disabled={isSelf && user.activo}
                            onClick={() => setToggleTarget(user)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p>
          Las cuentas se desactivan en lugar de eliminarse para preservar la
          trazabilidad de los alquileres y devoluciones. Debe existir siempre al
          menos un administrador activo.
        </p>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
        description={
          editingUser
            ? 'Actualiza los datos y permisos de la cuenta. Deja la contraseña vacía para conservarla.'
            : 'Crea una cuenta de acceso y asigna el rol correspondiente.'
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="user-form"
              loading={saving}
              icon={<Users className="h-4 w-4" />}
            >
              {editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <ErrorAlert message={formError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" htmlFor="nombreUsuario" required>
              <TextInput
                id="nombreUsuario"
                value={form.nombre}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nombre: event.target.value,
                  }))
                }
                required
                minLength={2}
                maxLength={120}
                placeholder="Nombre y apellidos"
              />
            </Field>
            <Field label="Correo electrónico" htmlFor="emailUsuario" required>
              <TextInput
                id="emailUsuario"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
                maxLength={160}
                placeholder="usuario@obragest.local"
              />
            </Field>
            <Field label="Rol" htmlFor="rolUsuario" required>
              <Select
                id="rolUsuario"
                value={form.rol}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    rol: event.target.value as UserRole,
                  }))
                }
              >
                <option value="EMPLEADO">Empleado</option>
                <option value="ADMIN">Administrador</option>
              </Select>
            </Field>
            <Field
              label={editingUser ? 'Nueva contraseña' : 'Contraseña'}
              htmlFor="passwordUsuario"
              required={!editingUser}
              hint={
                editingUser
                  ? 'Opcional. Mínimo 8 caracteres. Se cifrará con bcrypt.'
                  : 'Mínimo 8 caracteres. Se cifrará con bcrypt.'
              }
            >
              <div className="relative">
                <TextInput
                  id="passwordUsuario"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  required={!editingUser}
                  minLength={form.password ? 8 : undefined}
                  maxLength={72}
                  autoComplete="new-password"
                  placeholder={editingUser ? 'Dejar vacío para conservar' : '••••••••'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
                  aria-label={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Acceso al sistema
                </p>
                <p className="text-xs text-slate-500">
                  Desactiva la cuenta para impedir nuevos inicios de sesión.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.activo}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  activo: !current.activo,
                }))
              }
              disabled={Boolean(editingUser && editingUser.id === currentUser?.id)}
              className={`relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
                form.activo ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  form.activo ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => void handleToggle()}
        title={
          toggleTarget?.activo ? 'Desactivar usuario' : 'Activar usuario'
        }
        description={
          toggleTarget?.activo
            ? `¿Confirma que desea desactivar la cuenta de ${toggleTarget?.nombre ?? ''}? No podrá iniciar sesión hasta que se reactive.`
            : `¿Confirma que desea reactivar la cuenta de ${toggleTarget?.nombre ?? ''}?`
        }
        confirmLabel={toggleTarget?.activo ? 'Desactivar' : 'Activar'}
        loading={toggling}
      />
    </div>
  );
}
