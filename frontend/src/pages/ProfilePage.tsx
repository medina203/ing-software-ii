import { useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button, Field, TextInput } from '../components/ui/Button';
import { ErrorAlert, PageHeader, SectionCard } from '../components/ui/Feedback';
import { useToast } from '../components/Toast';
import api, { getErrorMessage } from '../lib/api';
import { roleLabels } from '../lib/format';

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const emptyForm: PasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function ProfilePage() {
  const { usuario } = useAuth();
  const { success } = useToast();
  const [form, setForm] = useState<PasswordFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const updateField = <K extends keyof PasswordFormState>(
    key: K,
    value: PasswordFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (form.newPassword.length < 8) {
      setFormError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setFormError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    if (form.newPassword === form.currentPassword) {
      setFormError('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm(emptyForm);
      setSuccessMessage('Contraseña actualizada correctamente.');
      success('Contraseña actualizada correctamente.');
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Mi cuenta"
        title="Perfil y seguridad"
        description="Consulta los datos de tu cuenta y actualiza tu contraseña de acceso."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_420px]">
        <SectionCard
          title="Datos de la cuenta"
          description="Información asociada a tu sesión actual."
        >
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                Nombre
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <UserRound className="h-4 w-4 text-slate-400" />
                {usuario?.nombre ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                Correo electrónico
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {usuario?.email ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                Rol
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {usuario ? roleLabels[usuario.rol] : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                Estado
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                {usuario?.activo ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Cambiar contraseña"
          description="Usa una contraseña de al menos 8 caracteres que no hayas utilizado antes."
        >
          <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
            {formError && <ErrorAlert message={formError} />}
            {successMessage && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                {successMessage}
              </div>
            )}

            <Field label="Contraseña actual" htmlFor="currentPassword" required>
              <TextInput
                id="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={(event) => updateField('currentPassword', event.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>

            <Field label="Nueva contraseña" htmlFor="newPassword" required>
              <TextInput
                id="newPassword"
                type="password"
                value={form.newPassword}
                onChange={(event) => updateField('newPassword', event.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
              />
            </Field>

            <Field label="Confirmar nueva contraseña" htmlFor="confirmPassword" required>
              <TextInput
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
              />
            </Field>

            <Button
              type="submit"
              className="w-full"
              loading={saving}
              icon={<KeyRound className="h-4 w-4" />}
            >
              Actualizar contraseña
            </Button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
