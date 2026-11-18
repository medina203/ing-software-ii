import { AlertTriangle } from 'lucide-react';
import { formatMoney } from '../lib/format';
import { cn } from '../lib/cn';
import type { InvoiceBreakdownData } from '../types';

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

interface InvoiceBreakdownProps {
  desglose: InvoiceBreakdownData;
  /** full: factura, pago y devolución. compact: celdas de tablas. */
  variant?: 'full' | 'compact';
  /** Oculta pagado y saldo (por ejemplo, en la lista de alquileres). */
  hidePayments?: boolean;
  className?: string;
}

/**
 * Desglose de lo cobrado por un alquiler: días pactados, días de retraso (a la
 * misma tarifa diaria) y total. Se reutiliza en factura, cartera, pago,
 * devolución y lista de alquileres.
 */
export function InvoiceBreakdown({
  desglose,
  variant = 'full',
  hidePayments = false,
  className,
}: InvoiceBreakdownProps) {
  const hasDelay = desglose.diasRetraso > 0;
  const saldo = Number(desglose.saldo);

  if (variant === 'compact') {
    return (
      <div
        className={cn('text-right', className)}
        data-testid="invoice-breakdown-compact"
      >
        <p className="font-semibold text-slate-800">{formatMoney(desglose.total)}</p>
        <p className="whitespace-nowrap text-[0.6875rem] text-slate-500">
          Alquiler {formatMoney(desglose.montoAlquiler)}
        </p>
        {hasDelay && (
          <p className="whitespace-nowrap text-[0.6875rem] font-semibold text-amber-700">
            + Retraso {formatMoney(desglose.montoRetraso)}
            <span className="block font-normal">
              {dias(desglose.diasRetraso)} de atraso
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5 text-xs', className)} data-testid="invoice-breakdown">
      <div className="flex justify-between gap-3 text-slate-500">
        <span>
          Alquiler · {dias(desglose.diasAlquiler)} × {formatMoney(desglose.tarifaDiaria)}
        </span>
        <span className="font-semibold text-slate-800">
          {formatMoney(desglose.montoAlquiler)}
        </span>
      </div>
      <div
        className={cn(
          'flex justify-between gap-3',
          hasDelay ? 'text-amber-700' : 'text-slate-400',
        )}
      >
        <span>
          Retraso · {dias(desglose.diasRetraso)}
          {hasDelay && ` × ${formatMoney(desglose.tarifaDiaria)}`}
        </span>
        <span className="font-semibold">{formatMoney(desglose.montoRetraso)}</span>
      </div>
      <div className="flex justify-between gap-3 border-t border-slate-200 pt-1.5 text-sm">
        <span className="font-bold text-slate-800">Total</span>
        <span className="font-bold text-slate-900" data-testid="invoice-total">
          {formatMoney(desglose.total)}
        </span>
      </div>
      {!hidePayments && (
        <>
          <div className="flex justify-between gap-3 text-slate-500">
            <span>Pagado</span>
            <span className="font-semibold text-slate-700">
              {formatMoney(desglose.pagado)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-semibold text-slate-700">Saldo</span>
            <span
              className={cn(
                'font-bold',
                saldo > 0 ? 'text-rose-700' : 'text-emerald-700',
              )}
            >
              {formatMoney(desglose.saldo)}
            </span>
          </div>
        </>
      )}
      {desglose.retrasoEnCurso && (
        <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[0.6875rem] leading-4 text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Los equipos no se han devuelto: el retraso suma{' '}
          {formatMoney(desglose.tarifaDiaria)} por cada día adicional hasta la devolución.
        </p>
      )}
    </div>
  );
}
