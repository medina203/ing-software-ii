import { Loader2, type LucideIcon } from 'lucide-react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 text-ink-900 shadow-sm hover:bg-brand-400 active:bg-brand-600 focus-visible:ring-brand-500/30',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400/20',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400/20',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-500 focus-visible:ring-rose-500/30',
  dark: 'bg-ink-900 text-white shadow-sm hover:bg-ink-800 focus-visible:ring-slate-700/30',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[0.9375rem]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-55',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: 'ghost' | 'secondary' | 'danger';
}

export function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  className,
  ...props
}: IconButtonProps) {
  const styles =
    variant === 'danger'
      ? 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
      : variant === 'secondary'
        ? 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg transition',
        styles,
        className,
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('input', className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('input cursor-pointer pr-9', className)} {...props}>
      {children}
    </select>
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('input min-h-24 resize-y', className)} {...props} />;
}

export function SearchInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className="input pl-9" {...props} />
    </div>
  );
}
