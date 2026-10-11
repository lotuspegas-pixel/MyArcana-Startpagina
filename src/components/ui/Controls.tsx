import type { ReactNode } from 'react';
import { cx } from '../../lib/util';

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('mb-4', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-ink/20'
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
            checked ? 'start-[1.125rem]' : 'start-0.5'
          )}
        />
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-faint">{hint}</span>}
      </span>
    </label>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: ReactNode;
  format?: (v: number) => string;
}) {
  return (
    <div className="mb-4">
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="label mb-0">{label}</span>
          <span className="text-xs font-medium tabular-nums text-ink-muted">
            {format ? format(value) : value}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink/15
          accent-accent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow"
      />
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cx('inline-flex rounded-md bg-ink/[0.07] p-0.5', className)}
      role="radiogroup"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-surface text-ink shadow-sm'
              : 'text-ink-muted hover:text-ink'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorSwatches({
  colors,
  value,
  onChange,
  allowNone,
  noneLabel,
}: {
  colors: string[];
  value?: string;
  onChange: (hex?: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowNone && (
        <button
          type="button"
          title={noneLabel}
          onClick={() => onChange(undefined)}
          className={cx(
            'grid h-7 w-7 place-items-center rounded-full border text-xs',
            !value ? 'border-accent ring-2 ring-accent/40' : 'border-line'
          )}
        >
          ∅
        </button>
      )}
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c}
          style={{ background: c }}
          className={cx(
            'h-7 w-7 rounded-full transition-transform hover:scale-110',
            value?.toLowerCase() === c.toLowerCase() &&
              'ring-2 ring-offset-2 ring-offset-surface ring-ink/60'
          )}
        />
      ))}
      <label
        className="grid h-7 w-7 cursor-pointer place-items-center rounded-full border
          border-dashed border-line text-xs text-ink-faint hover:border-accent"
        title="Custom"
      >
        +
        <input
          type="color"
          className="sr-only"
          value={value ?? '#6d4aff'}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}

/** An inline "are you sure" bar, used where a full dialog would be heavy. */
export function InlineConfirm({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
      <p className="text-sm text-ink">{message}</p>
      <div className="mt-2.5 flex gap-2">
        <button className="btn-danger px-3 py-1.5 text-xs" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-7 text-center">
      {icon && <div className="text-ink-faint">{icon}</div>}
      <p className="text-sm font-medium text-ink-muted">{title}</p>
      {hint && <p className="max-w-[22ch] text-xs text-ink-faint">{hint}</p>}
      {action}
    </div>
  );
}
