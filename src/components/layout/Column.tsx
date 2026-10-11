import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Minus, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import { WidgetView } from '../widgets/WidgetView';
import { useStore } from '../../store/useStore';
import type { Column as ColumnModel } from '../../store/types';
import { cx } from '../../lib/util';
import { useShallow } from 'zustand/react/shallow';

interface Props {
  column: ColumnModel;
  pageId: string;
  editMode: boolean;
  canRemove: boolean;
  onAddWidget: (columnId: string) => void;
}

export function Column({ column, pageId, editMode, canRemove, onAddWidget }: Props) {
  const { t } = useTranslation();
  const { setColumnWidth, removeColumn, addColumn } = useStore(useShallow((s) => ({
    setColumnWidth: s.setColumnWidth,
    removeColumn: s.removeColumn,
    addColumn: s.addColumn,
  })));

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { kind: 'column', columnId: column.id },
  });

  const ids = column.widgets.map((w) => w.id);

  return (
    <div
      ref={setNodeRef}
      className={cx(
        'flex min-w-0 flex-col gap-3 rounded-lg transition-colors',
        isOver && 'bg-accent/[0.07] outline-dashed outline-1 outline-accent/40'
      )}
      style={{ flex: `${column.width} 1 0%` }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {column.widgets.map((widget) => (
          <WidgetView key={widget.id} widget={widget} editMode={editMode} />
        ))}
      </SortableContext>

      {editMode && (
        <div className="flex items-center gap-1">
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border
              border-dashed border-line py-2.5 text-xs font-medium text-ink-faint
              transition-colors hover:border-accent/60 hover:bg-accent/5 hover:text-accent"
            onClick={() => onAddWidget(column.id)}
          >
            <Plus size={14} /> {t('column.addWidget')}
          </button>

          <Menu
            trigger={(p) => (
              <button
                {...p}
                className="btn-icon h-8 w-8 shrink-0 border border-dashed border-line"
                aria-label={t('page.columns')}
              >
                <MoreVertical size={14} />
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
