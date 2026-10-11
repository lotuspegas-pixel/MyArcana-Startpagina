import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Column } from './Column';
import { AddWidgetModal } from '../modals/AddWidgetModal';
import { findBookmark, useStore } from '../../store/useStore';
import type { Bookmark, Column as ColumnModel, Page, Widget } from '../../store/types';
import { useShallow } from 'zustand/react/shallow';

interface Props {
  page: Page;
  editMode: boolean;
}

/** Finds the column that holds a widget id. */
function columnOf(page: Page, widgetId: string): ColumnModel | undefined {
  return page.columns.find((c) => c.widgets.some((w) => w.id === widgetId));
}

/** Walks every bookmark widget looking for a bookmark id. */
function widgetHoldingBookmark(page: Page, bookmarkId: string): Widget | undefined {
  for (const column of page.columns) {
    for (const widget of column.widgets) {
      if (widget.config.bookmarks && findBookmark(widget.config.bookmarks, bookmarkId)) {
        return widget;
      }
    }
  }
  return undefined;
}

/** Index of a bookmark within its own list (root or folder children). */
function bookmarkIndex(list: Bookmark[], id: string): { list: Bookmark[]; index: number; folderId?: string } | null {
  const index = list.findIndex((b) => b.id === id);
  if (index >= 0) return { list, index };
  for (const b of list) {
    if (!b.children) continue;
    const hit = bookmarkIndex(b.children, id);
    if (hit) return { ...hit, folderId: hit.folderId ?? b.id };
  }
  return null;
}

export function PageGrid({ page, editMode }: Props) {
  const { moveWidget, moveBookmark, pages } = useStore(useShallow((s) => ({
    moveWidget: s.moveWidget,
    moveBookmark: s.moveBookmark,
    pages: s.pages,
  })));
  const [addTo, setAddTo] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ kind: string; label: string } | null>(null);

  const sensors = useSensors(
    // A small distance keeps a click on a bookmark from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const livePage = useMemo(
    () => pages.find((p) => p.id === page.id) ?? page,
    [pages, page]
  );

  const onDragStart = (event: DragStartEvent) => {
    const kind = String(event.active.data.current?.kind ?? '');
    if (kind === 'widget') {
      const w = livePage.columns.flatMap((c) => c.widgets).find((x) => x.id === event.active.id);
      setDragging({ kind, label: w?.title ?? '' });
    } else if (kind === 'bookmark') {
      const widget = widgetHoldingBookmark(livePage, String(event.active.id));
      const bm = widget && findBookmark(widget.config.bookmarks ?? [], String(event.active.id));
      setDragging({ kind, label: bm?.title ?? '' });
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    if (!over || active.id === over.id) return;

    const activeKind = active.data.current?.kind;
    const overKind = over.data.current?.kind;

    /* ----------------------------------------------------------- widgets */
    if (activeKind === 'widget') {
      const sourceColumn = columnOf(livePage, String(active.id));
      if (!sourceColumn) return;

      // Dropped straight onto a column (its empty area).
      if (overKind === 'column') {
        const targetId = String(over.data.current?.columnId);
        if (targetId === sourceColumn.id) return;
        moveWidget(String(active.id), targetId, -1);
        return;
      }

      // Dropped over another widget: take that widget's slot.
      if (overKind === 'widget') {
        const targetColumn = columnOf(livePage, String(over.id));
        if (!targetColumn) return;
        // `moveWidget` lifts the widget out before inserting, so the target
        // widget's own index is already the slot the drop should land in.
        const to = targetColumn.widgets.findIndex((w) => w.id === over.id);
        moveWidget(String(active.id), targetColumn.id, to);
      }
      return;
    }

    /* --------------------------------------------------------- bookmarks */
    if (activeKind === 'bookmark') {
      const sourceWidgetId = String(active.data.current?.widgetId ?? '');
      if (!sourceWidgetId) return;

      if (overKind === 'bookmark') {
        const targetWidgetId = String(over.data.current?.widgetId ?? '');
        const targetWidget = livePage.columns
          .flatMap((c) => c.widgets)
          .find((w) => w.id === targetWidgetId);
        if (!targetWidget?.config.bookmarks) return;
        const spot = bookmarkIndex(targetWidget.config.bookmarks, String(over.id));
        if (!spot) return;
        moveBookmark(
          sourceWidgetId,
          String(active.id),
          targetWidgetId,
          spot.index,
          spot.folderId
        );
        return;
      }

      // Dropped on a bookmarks widget's frame: append to its root list.
      if (overKind === 'widget') {
        const targetWidget = livePage.columns
          .flatMap((c) => c.widgets)
          .find((w) => w.id === over.id);
        if (targetWidget?.type !== 'bookmarks') return;
        moveBookmark(sourceWidgetId, String(active.id), String(over.id), -1);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start"
        style={{ gap: 'var(--col-gap)' }}>
        {livePage.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            pageId={livePage.id}
            editMode={editMode}
            canRemove={livePage.columns.length > 1}
            onAddWidget={setAddTo}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.18,.67,.6,1.22)' }}>
        {dragging && (
          <div className="pointer-events-none rounded-md bg-accent px-3 py-2 text-sm
            font-medium text-accent-fg shadow-pop">
            {dragging.label}
          </div>
        )}
      </DragOverlay>

      <AddWidgetModal columnId={addTo} pageId={livePage.id} onClose={() => setAddTo(null)} />
    </DndContext>
  );
}
