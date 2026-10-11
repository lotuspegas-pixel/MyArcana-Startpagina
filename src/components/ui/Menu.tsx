import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/util';

interface MenuCtx {
  close: () => void;
}
const Ctx = createContext<MenuCtx>({ close: () => {} });

interface MenuProps {
  /** The element that opens the menu; receives the trigger props. */
  trigger: (props: { onClick: (e: React.MouseEvent) => void; 'aria-expanded': boolean; id: string }) => ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

/**
 * A portal-based popover menu. It is portalled so a menu never gets clipped
 * by a widget's `overflow: hidden`, and positioned after mount so it can flip
 * when it would run off the viewport.
 */
export function Menu({ trigger, children, align = 'end', className }: MenuProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRect = useRef<DOMRect | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  const onTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) return close();
    anchorRect.current = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open || !anchorRect.current || !panel.current) return;
    const a = anchorRect.current;
    const p = panel.current.getBoundingClientRect();
    const gap = 6;
    let top = a.bottom + gap;
    // Flip above the trigger when there is no room below.
    if (top + p.height > window.innerHeight - 8) {
      top = Math.max(8, a.top - p.height - gap);
    }
    let left = align === 'end' ? a.right - p.width : a.left;
    left = Math.min(Math.max(8, left), window.innerWidth - p.width - 8);
    setPos({ top, left });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    // `true` so a click anywhere closes before other handlers run.
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open, close]);

  return (
    <>
      {trigger({ onClick: onTriggerClick, 'aria-expanded': open, id })}
      {open &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            aria-labelledby={id}
            className={cx('menu-panel fixed', className)}
            style={{
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              visibility: pos ? 'visible' : 'hidden',
            }}
          >
            <Ctx.Provider value={{ close }}>{children}</Ctx.Provider>
          </div>,
          document.body
        )}
    </>
  );
}

interface ItemProps {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Keeps the menu open — for toggles the user flips several times. */
  keepOpen?: boolean;
  shortcut?: string;
  checked?: boolean;
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  disabled,
  keepOpen,
  shortcut,
  checked,
}: ItemProps) {
  const { close } = useContext(Ctx);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cx('menu-item', danger && 'text-red-600 hover:bg-red-500/10')}
      onClick={() => {
        onClick?.();
        if (!keepOpen) close();
      }}
    >
      {icon && <span className="shrink-0 text-ink-faint">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {checked && <span className="text-accent">✓</span>}
      {shortcut && <kbd className="text-2xs text-ink-faint">{shortcut}</kbd>}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="menu-sep" role="separator" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
      {children}
    </div>
  );
}

/** Lets a menu item close the menu from inside custom content. */
export const useMenu = () => useContext(Ctx);
