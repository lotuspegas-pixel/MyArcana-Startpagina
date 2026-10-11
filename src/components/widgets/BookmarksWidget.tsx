import { useEffect, useMemo, useState } from 'react';
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
import { useShallow } from 'zustand/react/shallow';
import { Favicon } from '../ui/Favicon';
import { Menu, MenuItem, MenuSeparator } from '../ui/Menu';
import { SegmentedControl, Switch } from '../ui/Controls';
import {
  BookmarkEditor, draftOf, emptyDraft, type BookmarkDraft,
} from '../modals/BookmarkEditor';
import { useRegisterAdd } from './WidgetContext';
import { useStore } from '../../store/useStore';
import type { Bookmark, BookmarkView, Widget } from '../../store/types';
import { cx, normalizeUrl, titleFromUrl } from '../../lib/util';

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
  // Folders lead, as they do in every browser's bookmark manager.
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

  // The plus beside the card title belongs to the frame, so hand it over.
  const registerAdd = useRegisterAdd();
  useEffect(() => {
    registerAdd(() => setDraft(emptyDraft('link')));
    return () => registerAdd(null);
  }, [registerAdd]);

  const cfg = widget.config;
  const view: BookmarkView = cfg.view ?? 'list';
  const stored = cfg.bookmarks ?? [];
  const items = useMemo(() => sortBookmarks(stored, cfg.sort), [stored, cfg.sort]);
  const target = openNewTab || cfg.openInNewTab ? '_blank' : undefined;

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
  const shared = {
    widgetId: widget.id,
    editMode,
    target,
    showFavicons: cfg.showFavicons !== false,
    onOpen: (bm: Bookmark) => visitBookmark(widget.id, bm.id),
    onEdit: (bm: Bookmark) => setDraft(draftOf(bm)),
    onRemove: remove,
  };

  return (
    <>
      <div className={cx('px-2 pb-3 md:px-1.5 md:pb-2', widget.bare && 'pt-2')}>
        {configuring && (
          <div className="mb-2 space-y-2 rounded-md bg-ink/[0.06] p-2">
            <SegmentedControl<BookmarkView>
              value={view}
              onChange={(v) => patchWidgetConfig(widget.id, { view: v })}
              className="w-full"
              options={[
                { value: 'list', label: <List size={13} className="mx-auto" />, title: t('bookmark.view.list') },
                { value: 'tiles', label: <LayoutGrid size={13} className="mx-auto" />, title: t('bookmark.view.tiles') },
                { value: 'icons', label: <Rows3 size={13} className="mx-auto" />, title: t('bookmark.view.icons') },
                { value: 'compact', label: <span className="block text-center text-2xs">≡</span>, title: t('bookmark.view.compact') },
              ]}
            />
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
            <div className="flex flex-wrap gap-1.5">
              <button
                className="btn-outline px-2 py-1 text-2xs"
                onClick={() => setDraft(emptyDraft('folder'))}
              >
                <FolderPlus size={12} /> {t('bookmark.addFolder')}
              </button>
              <button className="btn-outline px-2 py-1 text-2xs" onClick={() => setBulk('')}>
                <List size={12} /> {t('bookmark.pasteMany')}
              </button>
            </div>
            <label className="block">
              <span className="label mb-1">{t('common.sort')}</span>
              <select
                className="field py-1 text-xs"
                value={cfg.sort ?? 'manual'}
                onChange={(e) =>
                  patchWidgetConfig(widget.id, {
                    sort: e.target.value as NonNullable<Widget['config']['sort']>,
                  })
                }
              >
                <option value="manual">{t('bookmark.sort.manual')}</option>
                <option value="title">{t('bookmark.sort.title')}</option>
                <option value="recent">{t('bookmark.sort.recent')}</option>
                <option value="visits">{t('bookmark.sort.visits')}</option>
              </select>
            </label>
          </div>
        )}

        {bulk !== null && (
          <div className="mb-2 rounded-md border border-line bg-ink/[0.04] p-2">
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
          <button
            className="flex w-full items-center gap-[7px] rounded px-1 py-1 text-start
              text-[15px] text-ink-faint transition-colors hover:bg-ink/5 hover:text-accent
              md:gap-1.5 md:px-[2px] md:text-[13px]"
            onClick={() => setDraft(emptyDraft('link'))}
          >
            <Plus size={16} className="shrink-0" />
            {t('bookmark.add')}
          </button>
        ) : view === 'tiles' ? (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${cfg.columns ?? 3}, minmax(0,1fr))` }}
            >
              {items.map((bm) => (
                <TileRow key={bm.id} bm={bm} {...shared} />
              ))}
            </div>
          </SortableContext>
        ) : view === 'icons' ? (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="flex flex-wrap gap-1">
              {items.map((bm) => (
                <IconRow key={bm.id} bm={bm} {...shared} />
              ))}
            </div>
          </SortableContext>
        ) : (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul>
              {items.map((bm) => (
                <ListRow key={bm.id} bm={bm} compact={view === 'compact'} {...shared} />
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
  showFavicons: boolean;
  compact?: boolean;
  onOpen: (bm: Bookmark) => void;
  onEdit: (bm: Bookmark) => void;
  onRemove: (bm: Bookmark) => void;
}

/** Shared edit affordances: a drag handle plus an edit/delete menu. */
function RowTools({
  bm, editMode, listeners, attributes, onEdit, onRemove, floating,
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
        'focus-within:opacity-100 group-hover/row:opacity-100',
        floating && 'absolute end-0.5 top-0.5 rounded bg-surface/95 shadow-sm'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="drag-handle grid h-5 w-4 place-items-center rounded text-ink-faint hover:text-ink"
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bm.id,
    data: { kind: 'bookmark', widgetId: props.widgetId },
    disabled: !editMode,
  });
  const updateBookmark = useStore((s) => s.updateBookmark);

  // Rows are 24 px on a phone and 19 px on a desktop, while the favicon stays
  // 16 px on both — only the type and the row height scale up.
  const rowText = compact ? 'text-[13px] md:text-[12px]' : 'text-[15px] md:text-[13px]';
  const rowHeight = compact ? 'h-5 md:h-4' : 'h-6 md:h-[19px]';
  const iconBox = compact ? 'h-[14px] w-[14px]' : 'h-4 w-4';

  if (bm.kind === 'folder') {
    const open = !bm.collapsed;
    return (
      <li
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        className={cx(isDragging && 'opacity-60')}
      >
        <div className="group/row flex items-center gap-1 rounded px-1 hover:bg-ink/[0.07] md:px-[2px]">
          <button
            className={cx(
              'flex min-w-0 flex-1 items-center gap-[7px] text-start md:gap-1.5',
              rowHeight
            )}
            onClick={() => updateBookmark(props.widgetId, bm.id, { collapsed: open })}
          >
            <ChevronRight
              size={13}
              className={cx('shrink-0 text-ink-faint transition-transform', open && 'rotate-90')}
            />
            {open ? (
              <FolderOpen className={cx('shrink-0 text-amber-500', iconBox)} />
            ) : (
              <Folder className={cx('shrink-0 text-amber-500', iconBox)} />
            )}
            <span className={cx('truncate text-ink', rowText)}>{bm.title}</span>
            <span className="shrink-0 text-2xs text-ink-faint">{bm.children?.length ?? 0}</span>
          </button>
          <RowTools {...props} listeners={listeners} attributes={attributes} />
        </div>
        {open && !!bm.children?.length && (
          <ul className="ms-3 border-s border-line ps-1.5">
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
      <div className="group/row flex items-center gap-1 rounded px-1 hover:bg-ink/[0.07] md:px-[2px]">
        <a
          href={bm.url}
          target={target}
          rel={target ? 'noreferrer' : undefined}
          title={bm.note || bm.url}
          onClick={() => onOpen(bm)}
          className={cx(
            'flex min-w-0 flex-1 items-center gap-[7px] text-ink md:gap-1.5',
            rowHeight,
            rowText
          )}
        >
          {showFavicons ? (
            <Favicon url={bm.url} icon={bm.icon} title={bm.title} className={iconBox} res={32} />
          ) : (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint"
              style={bm.color ? { background: bm.color } : undefined}
            />
          )}
          <span className="truncate">{bm.title}</span>
        </a>
        <RowTools {...props} listeners={listeners} attributes={attributes} />
      </div>
    </li>
  );
}

function TileRow(props: RowProps) {
  const { bm, editMode, target, onOpen, showFavicons } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bm.id,
    data: { kind: 'bookmark', widgetId: props.widgetId },
    disabled: !editMode,
  });
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
        className="flex h-full flex-col items-center gap-1.5 rounded-md bg-ink/[0.06] px-1
          py-2 text-center transition-colors hover:bg-ink/[0.12] md:gap-1 md:py-1.5"
      >
        {isFolder ? (
          <Folder className="h-7 w-7 text-amber-500 md:h-6 md:w-6" />
        ) : showFavicons ? (
          <Favicon
            url={bm.url}
            icon={bm.icon}
            title={bm.title}
            className="h-7 w-7 md:h-6 md:w-6"
            res={64}
            rounded="md"
          />
        ) : (
          <span
            className="h-7 w-7 rounded-md md:h-6 md:w-6"
            style={{ background: bm.color ?? 'rgb(var(--c-accent))' }}
          />
        )}
        <span className="line-clamp-2 text-[11px] font-medium leading-tight text-ink md:text-[10px]">
          {bm.title}
        </span>
      </a>
      <RowTools {...props} listeners={listeners} attributes={attributes} floating />
    </div>
  );
}

function IconRow(props: RowProps) {
  const { bm, editMode, target, onOpen } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bm.id,
    data: { kind: 'bookmark', widgetId: props.widgetId },
    disabled: !editMode,
  });
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
        className="grid h-10 w-10 place-items-center rounded-md bg-ink/[0.06] transition-colors
          hover:bg-ink/[0.12] md:h-8 md:w-8"
      >
        {isFolder ? (
          <Folder className="h-6 w-6 text-amber-500 md:h-5 md:w-5" />
        ) : (
          <Favicon
            url={bm.url}
            icon={bm.icon}
            title={bm.title}
            className="h-6 w-6 md:h-5 md:w-5"
            res={64}
            rounded="md"
          />
        )}
      </a>
      <RowTools {...props} listeners={listeners} attributes={attributes} floating />
    </div>
  );
}
