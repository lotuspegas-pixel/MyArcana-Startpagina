import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown, Copy, GripVertical, MoreHorizontal, Palette, PanelTopOpen,
  Plus, Settings2, Trash2,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useShallow } from 'zustand/react/shallow';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import { ColorSwatches } from '../ui/Controls';
import { WIDGET_COLORS } from '../../lib/theme';
import { cx } from '../../lib/util';
import { useStore } from '../../store/useStore';
import type { Widget } from '../../store/types';
import type { AddHandler } from './WidgetContext';

interface Props {
  widget: Widget;
  editMode: boolean;
  /** Whether the body should show its settings panel. */
  configuring: boolean;
  onToggleConfigure: () => void;
  /** The body's primary action, drawn as a plus beside the title. */
  onAdd: AddHandler;
  children: ReactNode;
}

export function WidgetFrame({
  widget,
  editMode,
  configuring,
  onToggleConfigure,
  onAdd,
  children,
}: Props) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const { updateWidget, removeWidget, duplicateWidget, confirmDelete } = useStore(
    useShallow((s) => ({
      updateWidget: s.updateWidget,
      removeWidget: s.removeWidget,
      duplicateWidget: s.duplicateWidget,
      confirmDelete: s.settings.confirmDelete,
    }))
  );

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id, data: { kind: 'widget' }, disabled: !editMode });

  const remove = () => {
    if (confirmDelete && !confirming) return setConfirming(true);
    removeWidget(widget.id);
  };

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        // A chosen colour reads as a hairline above the card rather than a
        // filled header bar, which is what the real thing looks like.
        borderTop: widget.color ? `2px solid ${widget.color}` : undefined,
      }}
      className={cx(
        'widget-card group/widget relative',
        isDragging && 'z-30 opacity-85 shadow-pop'
      )}
    >
      {!widget.bare && (
        <header className="flex items-center gap-1 px-3 pb-2.5 pt-3 md:px-2 md:pb-2 md:pt-2">
          {editMode && (
            <button
              {...attributes}
              {...listeners}
              className="drag-handle -ms-1.5 grid h-5 w-4 shrink-0 place-items-center rounded
                text-ink-faint opacity-0 transition-opacity group-hover/widget:opacity-70
                hover:!opacity-100 focus-visible:opacity-100"
              aria-label={t('common.moveUp')}
              tabIndex={-1}
            >
              <GripVertical size={13} />
            </button>
          )}

          <h2 className="min-w-0 flex-1 truncate">
            {editMode ? (
              <input
                value={widget.title}
                onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                aria-label={t('common.title')}
                className="w-full truncate rounded bg-transparent px-1 py-0 text-[16px]
                  font-bold uppercase leading-tight tracking-normal text-ink-title outline-none
                  hover:bg-ink/5 focus:bg-ink/10 md:text-[15px]"
                style={{ color: widget.color }}
              />
            ) : (
              <span
                className="block truncate px-1 py-0 text-[16px] font-bold uppercase leading-tight
                  tracking-normal text-ink-title md:text-[15px]"
                style={{ color: widget.color }}
              >
                {widget.title}
              </span>
            )}
          </h2>

          <div className="flex shrink-0 items-center gap-0.5">
            {onAdd && (
              <button
                className="btn-icon h-7 w-7 md:h-6 md:w-6"
                onClick={onAdd}
                aria-label={t('bookmark.add')}
                title={t('bookmark.add')}
              >
                <Plus size={16} />
              </button>
            )}

            <Menu
              trigger={(p) => (
                <button
                  {...p}
                  className={cx(
                    'btn-icon h-7 w-7 text-ink-muted md:h-6 md:w-6',
                    configuring && 'bg-accent/15 text-accent'
                  )}
                  aria-label={t('common.options')}
                >
                  <MoreHorizontal size={16} />
                </button>
              )}
            >
              <MenuItem
                icon={
                  <ChevronDown
                    size={15}
                    className={cx('transition-transform', widget.collapsed && '-rotate-90')}
                  />
                }
                onClick={() => updateWidget(widget.id, { collapsed: !widget.collapsed })}
              >
                {widget.collapsed ? t('common.expand') : t('common.collapse')}
              </MenuItem>
              {editMode && (
                <>
                  <MenuSeparator />
                  <MenuItem icon={<Settings2 size={15} />} onClick={onToggleConfigure}>
                    {t('widget.settings')}
                  </MenuItem>
                  <MenuItem icon={<Copy size={15} />} onClick={() => duplicateWidget(widget.id)}>
                    {t('common.duplicate')}
                  </MenuItem>
                  <MenuItem
                    icon={<PanelTopOpen size={15} />}
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
                </>
              )}
            </Menu>
          </div>
        </header>
      )}

      {confirming && (
        <div className="mx-2.5 mb-2 rounded-md border border-red-500/30 bg-red-500/10 p-2.5">
          <p className="text-xs text-ink">{t('widget.deleteConfirm', { name: widget.title })}</p>
          <div className="mt-2 flex gap-2">
            <button
              className="btn-danger px-2.5 py-1 text-xs"
              onClick={() => removeWidget(widget.id)}
            >
              {t('common.delete')}
            </button>
            <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {!widget.collapsed && children}

      {/* A bare widget still needs a way in while editing. */}
      {widget.bare && editMode && (
        <div
          className="absolute end-1 top-1 flex gap-0.5 opacity-0 transition-opacity
            group-hover/widget:opacity-100"
        >
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
                <MoreHorizontal size={13} />
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
