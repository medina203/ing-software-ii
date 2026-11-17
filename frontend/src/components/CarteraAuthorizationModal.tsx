import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button, Field, TextArea, TextInput } from './ui/Button';
import { ErrorAlert } from './ui/Feedback';
import { Modal } from './ui/Modal';
import { formatDate, formatMoney } from '../lib/format';
import type { PendingInvoicesResponse, RentalCarteraAuthorization } from '../types';

interface CarteraAuthorizationModalProps {
  open: boolean;
  onClose: () => void;
  pending: PendingInvoicesResponse | null;
  isAdmin: boolean;
  loading: boolean;
  error: string;
  onAuthorize: (authorization: RentalCarteraAuthorization) => void;
}

export function CarteraAuthorizationModal({
  open,
  onClose,
  pending,
  isAdmin,
  loading,
  error,
  onAuthorize,
}: CarteraAuthorizationModalProps) {
  const [motivo, setMotivo] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    if (!open) return;
    setMotivo('');
    setAdminEmail('');
    setAdminPassword('');
  }, [open]);

  const close = () => {
    if (!loading) onClose();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onAuthorize({
      motivo: motivo.trim(),
      ...(isAdmin
        ? {}
        : {
            adminEmail: adminEmail.trim(),
            adminPassword,
          }),
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Autorización de cartera"
      description="El cliente tiene saldo pendiente. Se requiere una excepción autorizada para registrar un nuevo alquiler."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="cartera-authorization-form"
            loading={loading}
            icon={<ShieldCheck className="h-4 w-4" />}
          >
            Autorizar y registrar
          </Button>
        </>
      }
    >
      <form id="cartera-authorization-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorAlert message={error} />}

        {pending && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Saldo pendiente del cliente
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-900">
              {formatMoney(pending.totalSaldo)}
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              {pending.cantidad}{' '}
              {pending.cantidad === 1 ? 'factura pendiente' : 'facturas pendientes'}
              {pending.vencidas > 0 && ` · ${pending.vencidas} vencida(s)`}
            </p>
            {pending.facturas[0] && (
              <p className="mt-2 border-t border-amber-200 pt-2 text-[11px] leading-5 text-amber-800">
                Factura de referencia:{' '}
                <span className="font-mono font-semibold">
                  {pending.facturas[0].codigoFactura}
                </span>{' '}
                · vence el {formatDate(pending.facturas[0].fechaVencimiento)}
              </p>
            )}
          </div>
        )}

        <Field
          label="Motivo de la autorización"
          htmlFor="cartera-motivo"
          required
          hint="Mínimo 5 caracteres. Quedará registrado en la auditoría junto con el saldo y los usuarios involucrados."
        >
          <TextArea
            id="cartera-motivo"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            minLength={5}
            maxLength={500}
            rows={3}
            required
            placeholder="Ej.: el cliente pagará la cartera pendiente con el nuevo alquiler…"
          />
        </Field>

        {isAdmin ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-800">
            Como administrador, tu usuario quedará registrado como autorizador de la
            excepción.
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">
              Credenciales del administrador que autoriza
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Correo del administrador"
                htmlFor="cartera-admin-email"
                required
              >
                <TextInput
                  id="cartera-admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  maxLength={160}
                  required
                  autoComplete="off"
                  placeholder="admin@obragest.local"
                />
              </Field>
              <Field
                label="Contraseña del administrador"
                htmlFor="cartera-admin-password"
                required
              >
                <TextInput
                  id="cartera-admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  maxLength={120}
                  required
                  autoComplete="off"
                  placeholder="••••••••"
                />
              </Field>
            </div>
            <p className="text-[11px] leading-5 text-slate-500">
              Las credenciales se validan en el servidor y no se almacenan en el
              navegador.
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
}
