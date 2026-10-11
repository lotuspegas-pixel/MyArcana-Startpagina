import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '../../lib/util';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind max-width class. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Renders without the body padding, for galleries and pickers. */
  flush?: boolean;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  flush,
}: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      // Keep tab focus inside the dialog while it is open.
      if (e.key === 'Tab' && panel.current) {
        const focusable = panel.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first field so keyboard users land inside the dialog.
    const timer = setTimeout(() => {
      panel.current
        ?.querySelector<HTMLElement>('input,textarea,select,button')
        ?.focus();
    }, 20);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto
        bg-black/45 p-4 pt-[6vh] animate-fade-in sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        className={cx(
          'w-full overflow-hidden rounded-xl bg-surface-raised shadow-pop animate-pop-in',
          SIZES[size]
        )}
      >
        {(title || description) && (
          <header className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              {title && <h2 className="truncate text-base font-semibold text-ink">{title}</h2>}
              {description && (
                <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
              )}
            </div>
            <button className="btn-icon -me-1.5 -mt-0.5" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </header>
        )}
        <div className={cx(flush ? '' : 'px-5 py-4', 'max-h-[70vh] overflow-y-auto')}>
          {children}
        </div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line
            bg-surface-sunken/60 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
