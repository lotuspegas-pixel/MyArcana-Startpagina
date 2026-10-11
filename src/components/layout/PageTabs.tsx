import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Copy, Image as ImageIcon, LayoutTemplate, Pencil, Plus, Share2, Trash2,
} from 'lucide-react';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import { useStore } from '../../store/useStore';
import type { Page } from '../../store/types';
import { cx } from '../../lib/util';
import { useShallow } from 'zustand/react/shallow';

const ICON_CHOICES = [
  '🏠', '💼', '🎬', '📰', '🎓', '🛒', '✈️', '🍽️', '⚽', '🎮',
  '🎵', '📚', '💰', '🧪', '🩺', '🐾', '🌱', '🔖', '⭐', '📄',
];

interface Props {
  editMode: boolean;
  onShare: (page: Page) => void;
  onTemplates: () => void;
  onPageBackground: (page: Page) => void;
}

export function PageTabs({ editMode, onShare, onTemplates, onPageBackground }: Props) {
  const { t } = useTranslation();
  const {
    pages, activePageId, setActivePage, addPage, updatePage, deletePage,
    duplicatePage, reorderPages, confirmDelete,
  } = useStore(useShallow((s) => ({
    pages: s.pages,
    activePageId: s.activePageId,
    setActivePage: s.setActivePage,
    addPage: s.addPage,
    updatePage: s.updatePage,
    deletePage: s.deletePage,
    duplicatePage: s.duplicatePage,
    reorderPages: s.reorderPages,
    confirmDelete: s.settings.confirmDelete,
  })));

  const [renaming, setRenaming] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = pages.findIndex((p) => p.id === active.id);
    const to = pages.findIndex((p) => p.id === over.id);
    if (from >= 0 && to >= 0) reorderPages(from, to);
  };

  const remove = (page: Page) => {
    if (pages.length <= 1) return;
    if (confirmDelete && !window.confirm(t('page.deleteConfirm', { name: page.title }))) return;
    deletePage(page.id);
  };

  return (
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={pages.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
          {pages.map((page) => (
            <Tab
              key={page.id}
              page={page}
              active={page.id === activePageId}
              editMode={editMode}
              renaming={renaming === page.id}
              onActivate={() => setActivePage(page.id)}
              onRename={() => setRenaming(page.id)}
              onRenamed={(title) => {
                updatePage(page.id, { title: title.trim() || t('page.untitled') });
                setRenaming(null);
              }}
              onIcon={(icon) => updatePage(page.id, { icon })}
              onDuplicate={() => duplicatePage(page.id)}
              onDelete={() => remove(page)}
              onShare={() => onShare(page)}
              onBackground={() => onPageBackground(page)}
              canDelete={pages.length > 1}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Menu
        align="start"
        trigger={(p) => (
          <button
            {...p}
            className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm
              text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label={t('nav.addPage')}
            title={t('nav.addPage')}
          >
            <Plus size={16} />
          </button>
        )}
      >
        <MenuItem
          icon={<Plus size={15} />}
          onClick={() => {
            const id = addPage(t('page.new'));
            setRenaming(id);
          }}
        >
          {t('page.new')}
        </MenuItem>
        <MenuItem icon={<LayoutTemplate size={15} />} onClick={onTemplates}>
          {t('template.title')}
        </MenuItem>
      </Menu>
    </div>
  );
}

interface TabProps {
  page: Page;
  active: boolean;
  editMode: boolean;
  renaming: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onRename: () => void;
  onRenamed: (title: string) => void;
  onIcon: (icon: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onShare: () => void;
  onBackground: () => void;
}

function Tab({
  page, active, editMode, renaming, canDelete, onActivate, onRename, onRenamed,
  onIcon, onDuplicate, onDelete, onShare, onBackground,
}: TabProps) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id, disabled: !editMode });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cx('group/tab flex shrink-0 items-center', isDragging && 'z-20 opacity-80')}
    >
      <div
        className={cx(
          'flex h-8 items-center gap-1.5 rounded-md ps-2 transition-colors',
          active
            ? 'bg-surface text-ink shadow-sm'
            : 'text-ink-muted hover:bg-ink/[0.06] hover:text-ink',
          editMode ? 'pe-0.5' : 'pe-2'
        )}
        {...(editMode ? listeners : {})}
        {...(editMode ? attributes : {})}
      >
        {page.icon && (
          <span className="text-sm leading-none" aria-hidden>
            {page.icon}
          </span>
        )}

        {renaming ? (
          <input
            ref={input}
            defaultValue={page.title}
            autoFocus
            size={Math.max(6, page.title.length)}
            className="min-w-0 border-0 bg-transparent text-sm font-medium outline-none"
            onBlur={(e) => onRenamed(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') input.current?.blur();
              if (e.key === 'Escape') {
                e.stopPropagation();
                onRenamed(page.title);
              }
            }}
          />
        ) : (
          <button
            className="max-w-[10rem] truncate text-sm font-medium"
            onClick={onActivate}
            onDoubleClick={() => editMode && onRename()}
          >
            {page.title}
          </button>
        )}

        {editMode && (
          <Menu
            trigger={(p) => (
              <button
                {...p}
                className={cx(
                  'grid h-6 w-6 shrink-0 place-items-center rounded text-ink-faint',
                  'opacity-0 transition-opacity hover:bg-ink/10 hover:text-ink',
                  'group-hover/tab:opacity-100 focus-visible:opacity-100',
                  active && 'opacity-60'
                )}
                aria-label={t('page.settings')}
              >
                <Pencil size={11} />
              </button>
            )}
          >
            <MenuItem icon={<Pencil size={15} />} onClick={onRename}>
              {t('page.rename')}
            </MenuItem>
            <MenuItem icon={<Copy size={15} />} onClick={onDuplicate}>
              {t('page.duplicate')}
            </MenuItem>
            <MenuItem icon={<ImageIcon size={15} />} onClick={onBackground}>
              {t('page.background')}
            </MenuItem>
            <MenuItem icon={<Share2 size={15} />} onClick={onShare}>
              {t('share.makeLink')}
            </MenuItem>
            <MenuSeparator />
            <MenuLabel>{t('page.icon')}</MenuLabel>
            <div className="grid grid-cols-10 gap-0.5 px-2 pb-2">
              {ICON_CHOICES.map((icon) => (
                <button
                  key={icon}
                  onClick={() => onIcon(icon)}
                  className={cx(
                    'grid h-6 w-6 place-items-center rounded text-sm hover:bg-ink/10',
                    page.icon === icon && 'bg-accent/15'
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
            <MenuSeparator />
            <MenuItem icon={<Trash2 size={15} />} danger disabled={!canDelete} onClick={onDelete}>
              {t('page.delete')}
            </MenuItem>
          </Menu>
        )}
      </div>
    </div>
  );
}
