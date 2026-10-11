import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Minus, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import { WidgetView } from '../widgets/WidgetView';
import { useStore } from '../../store/useStore';
import type { Column as ColumnModel } from '../../store/types';
import { cx } from '../../lib/util';

interface Props {
  column: ColumnModel;
  pageId: string;
  editMode: boolean;
  canRemove: boolean;
  onAddWidget: (columnId: string) => void;
}

export function Column({ column, pageId, editMode, canRemove, onAddWidget }: Props) {
  const { t } = useTranslation();
  const { setColumnWidth, removeColumn, addColumn } = useStore(
    useShallow((s) => ({
      setColumnWidth: s.setColumnWidth,
      removeColumn: s.removeColumn,
      addColumn: s.addColumn,
    }))
  );

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { kind: 'column', columnId: column.id },
  });

  const ids = column.widgets.map((w) => w.id);

  return (
    <div
      ref={setNodeRef}
      // The weight only applies once the columns sit side by side; on a phone
      // each column is a fixed slice of the viewport in a swipeable row.
      style={{ ['--col-w' as string]: String(column.width) }}
      className={cx(
        'flex w-[86vw] shrink-0 snap-start flex-col gap-2 rounded-lg transition-colors',
        'sm:w-[52vw]',
        'md:w-auto md:shrink md:snap-align-none md:flex-[var(--col-w)_1_0%]',
        isOver && 'bg-accent/[0.08] outline-dashed outline-1 outline-accent/40'
      )}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {column.widgets.map((widget) => (
          <WidgetView key={widget.id} widget={widget} editMode={editMode} />
        ))}
      </SortableContext>

      {editMode && (
        <div className="flex items-center gap-1">
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border
              border-dashed border-line py-2 text-xs font-medium text-ink-faint
              transition-colors hover:border-accent/60 hover:bg-accent/5 hover:text-accent
              md:py-1.5 md:text-[11px]"
            onClick={() => onAddWidget(column.id)}
          >
            <Plus size={13} /> {t('column.addWidget')}
          </button>

          <Menu
            trigger={(p) => (
              <button
                {...p}
                className="btn-icon h-8 w-8 shrink-0 border border-dashed border-line md:h-7 md:w-7"
                aria-label={t('page.columns')}
              >
                <MoreHorizontal size={14} />
              </button>
            )}
          >
            <MenuLabel>{t('column.width')}</MenuLabel>
            <div className="flex items-center gap-1.5 px-2.5 pb-2 pt-0.5">
              <button
                className="btn-icon h-6 w-6"
                onClick={() => setColumnWidth(pageId, column.id, column.width - 0.2)}
                aria-label={t('common.moveLeft')}
              >
                <Minus size={13} />
              </button>
              <span className="min-w-[2.5rem] text-center text-xs tabular-nums text-ink-muted">
                {column.width.toFixed(1)}×
              </span>
              <button
                className="btn-icon h-6 w-6"
                onClick={() => setColumnWidth(pageId, column.id, column.width + 0.2)}
                aria-label={t('common.moveRight')}
              >
                <Plus size={13} />
              </button>
            </div>
            <MenuSeparator />
            <MenuItem icon={<Plus size={15} />} onClick={() => addColumn(pageId)}>
              {t('column.add')}
            </MenuItem>
            <MenuItem
              icon={<Trash2 size={15} />}
              danger
              disabled={!canRemove}
              onClick={() => removeColumn(pageId, column.id)}
            >
              {t('column.delete')}
            </MenuItem>
          </Menu>
        </div>
      )}
    </div>
  );
}
