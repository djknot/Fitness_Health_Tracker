import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-ink2">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function CardTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="mb-3 flex items-start justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

type ButtonVariant = 'primary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variantClass =
    variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-ghost';
  return <button type={type} className={`btn ${variantClass} ${className}`} {...rest} />;
}

/**
 * Small square icon-only button; requires an aria-label.
 * `variant="danger"` (default) gets the destructive red hover — use
 * `variant="neutral"` for non-destructive actions like edit or favorite.
 */
export function IconButton({
  label,
  variant = 'danger',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: 'danger' | 'neutral' }) {
  const hover =
    variant === 'danger' ? 'hover:bg-bad/10 hover:text-bad' : 'hover:bg-accent-wash hover:text-ink';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors ${hover} focus-visible:outline-2 focus-visible:outline-accent ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...rest} />;
}

export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`input ${className}`} {...rest} />;
}

/** Labelled form control wrapper. */
export function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent-wash text-accent">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-ink2">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Placeholder shown where a chart would render but there isn't enough data yet. */
export function ChartEmpty({ message, className = 'h-56' }: { message: string; className?: string }) {
  return (
    <div className={`flex w-full items-center justify-center rounded-xl bg-page px-6 text-center text-sm text-muted ${className}`}>
      {message}
    </div>
  );
}
