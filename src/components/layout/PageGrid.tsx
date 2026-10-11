import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { Column } from './Column';
import { AddWidgetModal } from '../modals/AddWidgetModal';
import { findBookmark, useStore } from '../../store/useStore';
import type { Bookmark, Column as ColumnModel, Page, Widget } from '../../store/types';
import { cx } from '../../lib/util';

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
function bookmarkIndex(
  list: Bookmark[],
  id: string
): { index: number; folderId?: string } | null {
  const index = list.findIndex((b) => b.id === id);
  if (index >= 0) return { index };
  for (const b of list) {
    if (!b.children) continue;
    const hit = bookmarkIndex(b.children, id);
    if (hit) return { ...hit, folderId: hit.folderId ?? b.id };
  }
  return null;
}

export function PageGrid({ page, editMode }: Props) {
  const { t } = useTranslation();
  const { moveWidget, moveBookmark, pages } = useStore(
    useShallow((s) => ({
      moveWidget: s.moveWidget,
      moveBookmark: s.moveBookmark,
      pages: s.pages,
    }))
  );
  const [addTo, setAddTo] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ kind: string; label: string } | null>(null);

  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const sensors = useSensors(
    // A small distance keeps a tap on a bookmark from starting a drag, and
    // leaves room for a horizontal swipe through the columns.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const livePage = useMemo(() => pages.find((p) => p.id === page.id) ?? page, [pages, page]);

  /* ----------------------------------------------- mobile column carousel */

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, livePage.columns.length]);

  const step = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    // One column plus its gap, so a tap lands cleanly on the next card.
    const first = el.firstElementChild as HTMLElement | null;
    const amount = first ? first.offsetWidth + 16 : el.clientWidth * 0.86;
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  /* -------------------------------------------------------- drag and drop */

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

    if (activeKind === 'widget') {
      const sourceColumn = columnOf(livePage, String(active.id));
      if (!sourceColumn) return;

      // Dropped straight onto a column's empty area.
      if (overKind === 'column') {
        const targetId = String(over.data.current?.columnId);
        if (targetId === sourceColumn.id) return;
        moveWidget(String(active.id), targetId, -1);
        return;
      }

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
        moveBookmark(sourceWidgetId, String(active.id), targetWidgetId, spot.index, spot.folderId);
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

  const multiColumn = livePage.columns.length > 1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="relative">
        <div
          ref={track}
          onScroll={measure}
          // Phones swipe through the columns one at a time with the next one
          // peeking in; from `md` up they simply sit side by side.
          className={cx(
            'no-scrollbar -mx-3 flex snap-x snap-mandatory items-start overflow-x-auto px-3 pb-1',
            'sm:-mx-5 sm:px-5',
            'md:mx-0 md:snap-none md:overflow-visible md:px-0'
          )}
          style={{ gap: 'var(--col-gap)', scrollPaddingInline: '0.75rem' }}
        >
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

        {multiColumn && (
          <>
            <button
              className={cx(
                'absolute start-0 top-20 z-20 grid h-12 w-5 place-items-center rounded-e-md',
                'bg-ink/25 text-white backdrop-blur transition-opacity md:hidden',
                edges.left ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
              onClick={() => step(-1)}
              aria-label={t('common.moveLeft')}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className={cx(
                'absolute end-0 top-20 z-20 grid h-12 w-5 place-items-center rounded-s-md',
                'bg-ink/25 text-white backdrop-blur transition-opacity md:hidden',
                edges.right ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
              onClick={() => step(1)}
              aria-label={t('common.moveRight')}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.18,.67,.6,1.22)' }}>
        {dragging && (
          <div
            className="pointer-events-none rounded-md bg-accent px-3 py-2 text-sm font-medium
              text-accent-fg shadow-pop"
          >
            {dragging.label}
          </div>
        )}
      </DragOverlay>

      <AddWidgetModal columnId={addTo} pageId={livePage.id} onClose={() => setAddTo(null)} />
    </DndContext>
  );
}
