import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight, Folder, FolderOpen, FolderPlus, GripVertical, LayoutGrid,
  List, Pencil, Plus, Rows3, Trash2,
} from 'lucide-react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Favicon } from '../ui/Favicon';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import { EmptyState, SegmentedControl, Switch } from '../ui/Controls';
import {
  BookmarkEditor, draftOf, emptyDraft, type BookmarkDraft,
} from '../modals/BookmarkEditor';
import { useStore } from '../../store/useStore';
import type { Bookmark, BookmarkView, Widget } from '../../store/types';
import { cx, normalizeUrl, titleFromUrl } from '../../lib/util';
import { useShallow } from 'zustand/react/shallow';

interface Props {
  widget: Widget;
  editMode: boolean;
  /** True while the widget's settings panel is open. */
  configuring: boolean;
}

/** Applies the widget's sort mode without touching the stored order. */
function sortBookmarks(list: Bookmark[], mode: Widget['config']['sort']): Bookmark[] {
  if (!mode || mode === 'manual') return list;
  const sorted = list.slice();
  if (mode === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
  if (mode === 'recent') sorted.sort((a, b) => b.addedAt - a.addedAt);
  if (mode === 'visits') sorted.sort((a, b) => (b.visits ?? 0) - (a.visits ?? 0));
  // Folders always lead, as they do in every browser's bookmark manager.
  return sorted.sort((a, b) => Number(b.kind === 'folder') - Number(a.kind === 'folder'));
}

export function BookmarksWidget({ widget, editMode, configuring }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<BookmarkDraft | null>(null);
  const [bulk, setBulk] = useState<string | null>(null);
  const {
    addBookmark, updateBookmark, removeBookmark, visitBookmark,
    patchWidgetConfig, openNewTab, confirmDelete,
  } = useStore(useShallow((s) => ({
    addBookmark: s.addBookmark,
    updateBookmark: s.updateBookmark,
    removeBookmark: s.removeBookmark,
    visitBookmark: s.visitBookmark,
    patchWidgetConfig: s.patchWidgetConfig,
    openNewTab: s.settings.openLinksInNewTab,
    confirmDelete: s.settings.confirmDelete,
  })));

  const cfg = widget.config;
  const view: BookmarkView = cfg.view ?? 'list';
  const raw = cfg.bookmarks ?? [];
  const items = useMemo(() => sortBookmarks(raw, cfg.sort), [raw, cfg.sort]);

  const target = openNewTab || cfg.openInNewTab ? '_blank' : undefined;

  const open = (bm: Bookmark) => {
    visitBookmark(widget.id, bm.id);
  };

  const remove = (bm: Bookmark) => {
    const message =
      bm.kind === 'folder'
        ? t('bookmark.folderDeleteConfirm', { name: bm.title })
        : t('bookmark.deleteConfirm', { name: bm.title });
    if (confirmDelete && !window.confirm(message)) return;
    removeBookmark(widget.id, bm.id);
  };

  const saveDraft = (d: BookmarkDraft) => {
    const patch = {
      title: d.title,
      url: d.kind === 'folder' ? undefined : d.url,
      icon: d.icon || undefined,
      color: d.color,
      note: d.note || undefined,
    };
    if (d.id) updateBookmark(widget.id, d.id, patch);
    else addBookmark(widget.id, { ...patch, kind: d.kind });
  };

  const addMany = (text: string) => {
    for (const line of text.split('\n')) {
      const raw = line.trim();
      if (!raw) continue;
      // "Title | url" or a bare URL.
      const [a, b] = raw.split('|').map((s) => s.trim());
      const url = normalizeUrl(b || a);
      if (!url) continue;
      addBookmark(widget.id, { kind: 'link', title: b ? a : titleFromUrl(url), url });
    }
    setBulk(null);
  };

  const ids = items.map((b) => b.id);
  const shared = { widgetId: widget.id, editMode, target, onOpen: open, onEdit: (b: Bookmark) => setDraft(draftOf(b)), onRemove: remove };

  return (
    <>
      <div className={cx('px-2.5 pb-2.5', widget.bare ? 'pt-2.5' : 'pt-2')}>
        {editMode && (
          <div className="mb-2 flex items-center gap-1.5">
            {configuring ? (
              <SegmentedControl<BookmarkView>
                value={view}
                onChange={(v) => patchWidgetConfig(widget.id, { view: v })}
                className="flex-1"
                options={[
                  { value: 'list', label: <List size={13} className="mx-auto" />, title: t('bookmark.view.list') },
                  { value: 'tiles', label: <LayoutGrid size={13} className="mx-auto" />, title: t('bookmark.view.tiles') },
                  { value: 'icons', label: <Rows3 size={13} className="mx-auto" />, title: t('bookmark.view.icons') },
                  { value: 'compact', label: <span className="block text-center text-2xs">≡</span>, title: t('bookmark.view.compact') },
                ]}
              />
            ) : (
              <span className="flex-1" />
            )}
            <Menu
              trigger={(p) => (
                <button {...p} className="btn-icon h-7 w-7" aria-label={t('common.add')}>
                  <Plus size={15} />
                </button>
              )}
            >
              <MenuItem icon={<Plus size={15} />} onClick={() => setDraft(emptyDraft('link'))}>
                {t('bookmark.add')}
              </MenuItem>
              <MenuItem
                icon={<FolderPlus size={15} />}
                onClick={() => setDraft(emptyDraft('folder'))}
              >
                {t('bookmark.addFolder')}
              </MenuItem>
              <MenuItem icon={<List size={15} />} onClick={() => setBulk('')}>
                {t('bookmark.pasteMany')}
              </MenuItem>
              <MenuSeparator />
              <MenuLabel>{t('common.sort')}</MenuLabel>
              <MenuItem
                checked={cfg.sort === 'manual' || !cfg.sort}
                onClick={() => patchWidgetConfig(widget.id, { sort: 'manual' })}
              >
                {t('bookmark.sort.manual')}
              </MenuItem>
              <MenuItem
                checked={cfg.sort === 'title'}
                onClick={() => patchWidgetConfig(widget.id, { sort: 'title' })}
              >
                {t('bookmark.sort.title')}
              </MenuItem>
              <MenuItem
                checked={cfg.sort === 'recent'}
                onClick={() => patchWidgetConfig(widget.id, { sort: 'recent' })}
              >
                {t('bookmark.sort.recent')}
              </MenuItem>
              <MenuItem
                checked={cfg.sort === 'visits'}
                onClick={() => patchWidgetConfig(widget.id, { sort: 'visits' })}
              >
                {t('bookmark.sort.visits')}
              </MenuItem>
            </Menu>
          </div>
        )}

        {configuring && (
          <div className="mb-2 space-y-1 rounded-md bg-surface-sunken p-2">
            <Switch
              checked={cfg.showFavicons !== false}
              onChange={(v) => patchWidgetConfig(widget.id, { showFavicons: v })}
              label={t('bookmark.showFavicons')}
            />
            {view === 'tiles' && (
              <label className="flex items-center gap-2 text-2xs text-ink-muted">
                {t('bookmark.tileColumns')}
                <input
                  type="number"
                  min={1}
                  max={6}
                  className="field w-16 py-1 text-xs"
                  value={cfg.columns ?? 3}
                  onChange={(e) =>
                    patchWidgetConfig(widget.id, {
                      columns: Math.min(6, Math.max(1, Number(e.target.value) || 3)),
                    })
                  }
                />
              </label>
            )}
          </div>
        )}

        {bulk !== null && (
          <div className="mb-2 rounded-md border border-line bg-surface-sunken p-2.5">
            <textarea
              className="field min-h-[6rem] font-mono text-xs"
              autoFocus
              placeholder={'nos.nl\nNOS | https://nos.nl'}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
            />
            <p className="mt-1.5 text-2xs text-ink-faint">{t('bookmark.pasteManyHint')}</p>
            <div className="mt-2 flex gap-2">
              <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => addMany(bulk)}>
                {t('common.add')}
              </button>
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setBulk(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {!items.length ? (
          <EmptyState
            icon={<Folder size={22} />}
            title={t('bookmark.empty')}
            hint={editMode ? t('bookmark.emptyHint') : undefined}
            action={
              editMode ? (
                <button
                  className="btn-outline mt-1 px-3 py-1.5 text-xs"
                  onClick={() => setDraft(emptyDraft('link'))}
                >
                  <Plus size={13} /> {t('bookmark.add')}
                </button>
              ) : undefined
            }
          />
        ) : view === 'tiles' ? (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${cfg.columns ?? 3}, minmax(0,1fr))` }}
            >
              {items.map((bm) => (
                <TileRow key={bm.id} bm={bm} {...shared} showFavicons={cfg.showFavicons !== false} />
              ))}
            </div>
          </SortableContext>
        ) : view === 'icons' ? (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="flex flex-wrap gap-1.5">
              {items.map((bm) => (
                <IconRow key={bm.id} bm={bm} {...shared} />
              ))}
            </div>
          </SortableContext>
        ) : (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className={cx(view === 'compact' ? 'space-y-px' : 'space-y-0.5')}>
              {items.map((bm) => (
                <ListRow
                  key={bm.id}
                  bm={bm}
                  compact={view === 'compact'}
                  showFavicons={cfg.showFavicons !== false}
                  {...shared}
                />
              ))}
            </ul>
          </SortableContext>
        )}
      </div>

      <BookmarkEditor draft={draft} onClose={() => setDraft(null)} onSave={saveDraft} />
    </>
  );
}

/* --------------------------------------------------------------- row types */

interface RowProps {
  bm: Bookmark;
  widgetId: string;
  editMode: boolean;
  target?: string;
  showFavicons?: boolean;
  compact?: boolean;
  onOpen: (bm: Bookmark) => void;
  onEdit: (bm: Bookmark) => void;
  onRemove: (bm: Bookmark) => void;
}

/** Shared edit affordances: a drag handle plus an edit/delete menu. */
function RowTools({
  bm,
  editMode,
  listeners,
  attributes,
  onEdit,
  onRemove,
  floating,
}: Pick<RowProps, 'bm' | 'editMode' | 'onEdit' | 'onRemove'> & {
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
  floating?: boolean;
}) {
  const { t } = useTranslation();
  if (!editMode) return null;
  return (
    <span
      className={cx(
        'flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity',
        'group-hover/row:opacity-100 focus-within:opacity-100',
        floating && 'absolute end-0.5 top-0.5 rounded bg-surface/95 shadow-sm'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="drag-handle grid h-5 w-4 place-items-center rounded text-ink-faint
          hover:text-ink"
        tabIndex={-1}
        aria-label={t('common.moveUp')}
        onClick={(e) => e.preventDefault()}
      >
        <GripVertical size={12} />
      </button>
      <Menu
        align="end"
        trigger={(p) => (
          <button
            {...p}
            className="grid h-5 w-5 place-items-center rounded text-ink-faint hover:text-ink"
            aria-label={t('common.options')}
          >
            <Pencil size={11} />
          </button>
        )}
      >
        <MenuItem icon={<Pencil size={15} />} onClick={() => onEdit(bm)}>
          {t('common.edit')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Trash2 size={15} />} danger onClick={() => onRemove(bm)}>
          {t('common.delete')}
        </MenuItem>
      </Menu>
    </span>
  );
}

function ListRow(props: RowProps) {
  const { bm, editMode, target, showFavicons, compact, onOpen } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bm.id, data: { kind: 'bookmark', widgetId: props.widgetId }, disabled: !editMode });
  const updateBookmark = useStore((s) => s.updateBookmark);

  if (bm.kind === 'folder') {
    const openFolder = !bm.collapsed;
    return (
      <li
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        className={cx(isDragging && 'opacity-60')}
      >
        <div className="group/row flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-ink/5">
          <button
            className="flex min-w-0 flex-1 items-center gap-1.5 text-start"
            onClick={() => updateBookmark(props.widgetId, bm.id, { collapsed: openFolder })}
          >
            <ChevronRight
              size={13}
              className={cx('shrink-0 text-ink-faint transition-transform', openFolder && 'rotate-90')}
            />
            {openFolder ? (
              <FolderOpen size={15} className="shrink-0 text-amber-500" />
            ) : (
              <Folder size={15} className="shrink-0 text-amber-500" />
            )}
            <span className="truncate text-sm font-medium text-ink">{bm.title}</span>
            <span className="shrink-0 text-2xs text-ink-faint">{bm.children?.length ?? 0}</span>
          </button>
          <RowTools {...props} listeners={listeners} attributes={attributes} />
        </div>
        {openFolder && !!bm.children?.length && (
          <ul className="ms-4 mt-0.5 space-y-0.5 border-s border-line ps-2">
            {bm.children.map((child) => (
              <ListRow key={child.id} {...props} bm={child} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cx(isDragging && 'opacity-60')}
    >
      <div className="group/row flex items-center gap-2 rounded hover:bg-ink/5">
        <a
          href={bm.url}
          target={target}
          rel={target ? 'noreferrer' : undefined}
          title={bm.note || bm.url}
          onClick={() => onOpen(bm)}
          className={cx(
            'flex min-w-0 flex-1 items-center gap-2 px-1.5 text-sm text-ink',
            compact ? 'py-0.5' : 'py-1'
          )}
        >
          {showFavicons && (
            <Favicon url={bm.url} icon={bm.icon} title={bm.title} size={compact ? 14 : 18} />
          )}
          {bm.color && !showFavicons && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: bm.color }}
            />
          )}
          <span className="truncate">{bm.title}</span>
          {bm.note && !compact && (
            <span className="truncate text-2xs text-ink-faint">— {bm.note}</span>
          )}
        </a>
        <RowTools {...props} listeners={listeners} attributes={attributes} />
      </div>
    </li>
  );
}

function TileRow(props: RowProps) {
  const { bm, editMode, target, onOpen, showFavicons } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bm.id, data: { kind: 'bookmark', widgetId: props.widgetId }, disabled: !editMode });

  const isFolder = bm.kind === 'folder';
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cx('group/row relative', isDragging && 'opacity-60')}
    >
      <a
        href={isFolder ? undefined : bm.url}
        target={isFolder ? undefined : target}
        rel={target ? 'noreferrer' : undefined}
        title={bm.note || bm.url || bm.title}
        onClick={() => !isFolder && onOpen(bm)}
        className="flex h-full flex-col items-center gap-1.5 rounded-lg border border-line
          bg-surface-sunken/60 px-1.5 py-2.5 text-center transition-colors
          hover:border-accent/40 hover:bg-accent/5"
      >
        {isFolder ? (
          <Folder size={26} className="text-amber-500" />
        ) : showFavicons !== false ? (
          <Favicon url={bm.url} icon={bm.icon} title={bm.title} size={26} rounded="md" />
        ) : (
          <span
            className="h-6 w-6 rounded-md"
            style={{ background: bm.color ?? 'rgb(var(--c-accent))' }}
          />
        )}
        <span className="line-clamp-2 text-2xs font-medium leading-tight text-ink">
          {bm.title}
        </span>
      </a>
      <RowTools {...props} listeners={listeners} attributes={attributes} floating />
    </div>
  );
}

function IconRow(props: RowProps) {
  const { bm, editMode, target, onOpen } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bm.id, data: { kind: 'bookmark', widgetId: props.widgetId }, disabled: !editMode });
  const isFolder = bm.kind === 'folder';

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cx('group/row relative', isDragging && 'opacity-60')}
    >
      <a
        href={isFolder ? undefined : bm.url}
        target={isFolder ? undefined : target}
        rel={target ? 'noreferrer' : undefined}
        title={bm.title}
        onClick={() => !isFolder && onOpen(bm)}
        className="grid h-10 w-10 place-items-center rounded-lg border border-line
          bg-surface-sunken/60 transition-colors hover:border-accent/40 hover:bg-accent/5"
      >
        {isFolder ? (
          <Folder size={20} className="text-amber-500" />
        ) : (
          <Favicon url={bm.url} icon={bm.icon} title={bm.title} size={22} rounded="md" />
        )}
      </a>
      <RowTools {...props} listeners={listeners} attributes={attributes} floating />
    </div>
  );
}
