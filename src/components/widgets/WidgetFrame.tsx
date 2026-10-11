import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown, Copy, GripVertical, MoreVertical, Palette, PanelTopClose,
  PanelTopOpen, Settings2, Trash2,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import { ColorSwatches } from '../ui/Controls';
import { WIDGET_COLORS } from '../../lib/theme';
import { cx, readableOn } from '../../lib/util';
import { useStore } from '../../store/useStore';
import type { Widget } from '../../store/types';
import { widgetMeta } from './registry';
import { useShallow } from 'zustand/react/shallow';

interface Props {
  widget: Widget;
  editMode: boolean;
  /** Whether the body should show its settings panel. */
  configuring: boolean;
  onToggleConfigure: () => void;
  /** Extra buttons the widget body contributes to the header. */
  actions?: ReactNode;
  children: ReactNode;
}

export function WidgetFrame({
  widget,
  editMode,
  configuring,
  onToggleConfigure,
  actions,
  children,
}: Props) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const { updateWidget, removeWidget, duplicateWidget, settings } = useStore(useShallow((s) => ({
    updateWidget: s.updateWidget,
    removeWidget: s.removeWidget,
    duplicateWidget: s.duplicateWidget,
    settings: s.settings,
  })));

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id, data: { kind: 'widget' }, disabled: !editMode });

  const Icon = widgetMeta(widget.type).icon;
  const tinted = !!widget.color;

  const remove = () => {
    if (settings.confirmDelete && !confirming) return setConfirming(true);
    removeWidget(widget.id);
  };

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cx(
        'widget-card group/widget relative',
        isDragging && 'z-30 opacity-85 shadow-pop',
        !isDragging && 'hover:shadow-widget-hover'
      )}
    >
      {!widget.bare && (
        <header
          className={cx(
            'flex items-center gap-1 rounded-t-widget px-2.5 py-2',
            tinted ? 'text-[rgb(var(--wc-fg))]' : 'border-b border-line text-ink'
          )}
          style={
            tinted
              ? ({
                  background: widget.color,
                  ['--wc-fg' as string]: readableOn(widget.color!),
                } as React.CSSProperties)
              : undefined
          }
        >
          {editMode && (
            <button
              {...attributes}
              {...listeners}
              className={cx(
                'drag-handle -ms-1 grid h-6 w-5 place-items-center rounded opacity-0',
                'transition-opacity group-hover/widget:opacity-60 hover:!opacity-100',
                'focus-visible:opacity-100'
              )}
              aria-label={t('common.moveUp')}
              tabIndex={-1}
            >
              <GripVertical size={14} />
            </button>
          )}

          <Icon size={14} className={cx('shrink-0', tinted ? 'opacity-80' : 'text-ink-faint')} />

          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
            {editMode ? (
              <input
                value={widget.title}
                onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                className="w-full truncate rounded bg-transparent px-1 py-0.5 text-sm font-semibold
                  outline-none hover:bg-black/5 focus:bg-black/10 dark:hover:bg-white/10"
                aria-label={t('common.title')}
              />
            ) : (
              <span className="px-1">{widget.title}</span>
            )}
          </h2>

          <div className="flex shrink-0 items-center gap-0.5">
            {actions}
            {editMode && (
              <button
                className={cx(
                  'btn-icon h-6 w-6',
                  configuring && !tinted && 'bg-accent/15 text-accent',
                  tinted && 'text-current hover:bg-black/10 hover:text-current',
                  configuring && tinted && 'bg-black/15'
                )}
                onClick={onToggleConfigure}
                aria-pressed={configuring}
                aria-label={t('widget.settings')}
                title={t('widget.settings')}
              >
                <Settings2 size={14} />
              </button>
            )}
            <button
              className={cx(
                'btn-icon h-6 w-6',
                tinted && 'text-current hover:bg-black/10 hover:text-current'
              )}
              onClick={() => updateWidget(widget.id, { collapsed: !widget.collapsed })}
              aria-label={widget.collapsed ? t('common.expand') : t('common.collapse')}
            >
              <ChevronDown
                size={15}
                className={cx('transition-transform', widget.collapsed && '-rotate-90')}
              />
            </button>

            {editMode && (
              <Menu
                trigger={(p) => (
                  <button
                    {...p}
                    className={cx(
                      'btn-icon h-6 w-6',
                      tinted && 'text-current hover:bg-black/10 hover:text-current'
                    )}
                    aria-label={t('common.options')}
                  >
                    <MoreVertical size={15} />
                  </button>
                )}
              >
                <MenuItem icon={<Settings2 size={15} />} onClick={onToggleConfigure}>
                  {t('widget.settings')}
                </MenuItem>
                <MenuItem
                  icon={<Copy size={15} />}
                  onClick={() => duplicateWidget(widget.id)}
                >
                  {t('common.duplicate')}
                </MenuItem>
                <MenuItem
                  icon={widget.bare ? <PanelTopOpen size={15} /> : <PanelTopClose size={15} />}
                  onClick={() => updateWidget(widget.id, { bare: !widget.bare })}
                >
                  {t('widget.hideHeader')}
                </MenuItem>
                <MenuSeparator />
                <MenuLabel>
                  <span className="inline-flex items-center gap-1.5">
                    <Palette size={12} /> {t('widget.color')}
                  </span>
                </MenuLabel>
                <div className="px-2.5 pb-2 pt-0.5">
                  <ColorSwatches
                    colors={WIDGET_COLORS}
                    value={widget.color}
                    onChange={(color) => updateWidget(widget.id, { color })}
                    allowNone
                    noneLabel={t('widget.noColor')}
                  />
                </div>
                <MenuSeparator />
                <MenuItem icon={<Trash2 size={15} />} danger onClick={remove}>
                  {t('widget.delete')}
                </MenuItem>
              </Menu>
            )}
          </div>
        </header>
      )}

      {confirming && (
        <div className="border-b border-red-500/30 bg-red-500/5 px-3 py-2.5">
          <p className="text-xs text-ink">
            {t('widget.deleteConfirm', { name: widget.title })}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              className="btn-danger px-2.5 py-1 text-xs"
              onClick={() => removeWidget(widget.id)}
            >
              {t('common.delete')}
            </button>
            <button
              className="btn-ghost px-2.5 py-1 text-xs"
              onClick={() => setConfirming(false)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {!widget.collapsed && (
        <div className={cx(widget.bare && 'rounded-widget')}>{children}</div>
      )}

      {/* A bare widget still needs a way in when editing. */}
      {widget.bare && editMode && (
        <div className="absolute end-1 top-1 flex gap-0.5 opacity-0 transition-opacity
          group-hover/widget:opacity-100">
          <button
            {...attributes}
            {...listeners}
            className="drag-handle btn-icon h-6 w-6 bg-surface/90 shadow-sm"
            aria-label={t('common.moveUp')}
            tabIndex={-1}
          >
            <GripVertical size={13} />
          </button>
          <Menu
            trigger={(p) => (
              <button {...p} className="btn-icon h-6 w-6 bg-surface/90 shadow-sm">
                <MoreVertical size={13} />
              </button>
            )}
          >
            <MenuItem icon={<Settings2 size={15} />} onClick={onToggleConfigure}>
              {t('widget.settings')}
            </MenuItem>
            <MenuItem
              icon={<PanelTopOpen size={15} />}
              onClick={() => updateWidget(widget.id, { bare: false })}
            >
              {t('widget.hideHeader')}
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash2 size={15} />} danger onClick={remove}>
              {t('widget.delete')}
            </MenuItem>
          </Menu>
        </div>
      )}
    </section>
  );
}
