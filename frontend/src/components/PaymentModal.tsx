import { useEffect, useState, type FormEvent } from 'react';
import { CircleDollarSign } from 'lucide-react';
import { useToast } from './Toast';
import { Button, Field, Select, TextInput } from './ui/Button';
import { ErrorAlert } from './ui/Feedback';
import { Modal } from './ui/Modal';
import api, { getErrorMessage } from '../lib/api';
import { formatDate, formatMoney, paymentMethodLabels } from '../lib/format';
import type { CreatePaymentPayload, Invoice, PaymentMethod } from '../types';

interface PaymentModalProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  onPaid: (invoice: Invoice) => void | Promise<void>;
}

export function PaymentModal({ invoice, open, onClose, onPaid }: PaymentModalProps) {
  const { success } = useToast();
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('EFECTIVO');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !invoice) return;
    setMonto(Number(invoice.saldo).toFixed(2));
    setMetodoPago('EFECTIVO');
    setReferencia('');
    setError('');
  }, [open, invoice]);

  if (!invoice) return null;

  const saldo = Number(invoice.saldo);
  const montoNumerico = Number(monto);

  const close = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setError('Ingrese un monto mayor que cero.');
      return;
    }

    if (montoNumerico > saldo) {
      setError(`El monto no puede superar el saldo pendiente de ${formatMoney(saldo)}.`);
      return;
    }

    setSaving(true);
    try {
      const payload: CreatePaymentPayload = {
        monto: montoNumerico,
        metodoPago,
        ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
      };
      const response = await api.post<Invoice>(
        `/invoices/${invoice.id}/payments`,
        payload,
      );
      success('Pago registrado correctamente.');
      await onPaid(response.data);
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Registrar pago"
      description={`Factura ${invoice.codigoFactura}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="payment-form"
            loading={saving}
            icon={<CircleDollarSign className="h-4 w-4" />}
          >
            Registrar pago
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorAlert message={error} />}

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Total factura</span>
            <strong className="text-slate-800">{formatMoney(invoice.total)}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Saldo pendiente</span>
            <strong className="text-rose-700">{formatMoney(invoice.saldo)}</strong>
          </div>
          <p className="border-t border-slate-200 pt-2 text-xs text-slate-500">
            Vencimiento: {formatDate(invoice.fechaVencimiento)}
          </p>
        </div>

        <Field
          label="Monto a pagar"
          htmlFor="payment-amount"
          required
          hint={`Máximo permitido: ${formatMoney(saldo)}`}
        >
          <TextInput
            id="payment-amount"
            type="number"
            min="0.01"
            max={saldo}
            step="0.01"
            value={monto}
            onChange={(event) => setMonto(event.target.value)}
            required
            autoFocus
          />
        </Field>

        <Field label="Método de pago" htmlFor="payment-method" required>
          <Select
            id="payment-method"
            value={metodoPago}
            onChange={(event) => setMetodoPago(event.target.value as PaymentMethod)}
          >
            {Object.entries(paymentMethodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Referencia"
          htmlFor="payment-reference"
          hint="Opcional: número de transferencia, comprobante o nota."
        >
          <TextInput
            id="payment-reference"
            value={referencia}
            onChange={(event) => setReferencia(event.target.value)}
            maxLength={120}
            placeholder="Ej.: transferencia #45821"
          />
        </Field>
      </form>
    </Modal>
  );
}
