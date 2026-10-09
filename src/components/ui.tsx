import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink/90 shadow-[0_6px_18px_-8px_rgb(16_32_27/0.6)]',
  secondary: 'bg-raised text-ink ring-1 ring-rule hover:ring-ink/40',
  ghost: 'text-ink hover:bg-ink/5',
  danger: 'text-owe hover:bg-owe-wash',
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: 'md' | 'lg' | 'sm' }>(
  function Button({ variant = 'primary', loading, size = 'md', className = '', children, disabled, ...rest }, ref) {
    const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-[15px]', lg: 'h-14 px-6 text-base' };
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${sizes[size]} ${variants[variant]} ${className}`}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

export function IconButton({ label, children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={`inline-grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/6 ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, id }: { label: string; hint?: string; error?: string; id: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="text-sm text-owe" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'h-12 w-full rounded-xl bg-raised px-3.5 text-base text-ink ring-1 ring-rule outline-none placeholder:text-ink-2/70 transition-shadow focus:ring-2 focus:ring-ink aria-invalid:ring-owe';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }>(
  function TextInput({ label, hint, error, className = '', id: idProp, ...rest }, ref) {
    const auto = useId();
    const id = idProp ?? auto;
    return (
      <Field label={label} hint={hint} error={error} id={id}>
        <input
          ref={ref}
          id={id}
          className={`${inputClass} ${className}`}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          {...rest}
        />
      </Field>
    );
  },
);

export function Segmented<T extends string>({ value, options, onChange, label, className = '' }: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex rounded-full bg-ink/6 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 flex-1 rounded-full px-3 text-sm font-semibold transition-all duration-200 ${value === o.value ? 'bg-raised text-ink shadow-[0_1px_4px_rgb(0_0_0/0.12)]' : 'text-ink-2 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
