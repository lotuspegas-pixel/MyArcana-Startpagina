import { forwardRef, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search, X } from 'lucide-react';
import { Menu, MenuItem, MenuLabel } from '../ui/Menu';
import { Favicon } from '../ui/Favicon';
import { useStore } from '../../store/useStore';
import { SEARCH_ENGINES, buildSearchUrl, engineById, parseBang } from '../../lib/searchEngines';
import type { Bookmark } from '../../store/types';
import { cx } from '../../lib/util';
import { useShallow } from 'zustand/react/shallow';

interface Props {
  /** Engine override for the search widget; the header uses the global one. */
  engineId?: string;
  onEngineChange?: (id: string) => void;
  size?: 'md' | 'lg';
  autoFocus?: boolean;
  className?: string;
}

interface Hit {
  bookmark: Bookmark;
  pageTitle: string;
}

/**
 * The search field. It searches the chosen engine, understands `!bang`
 * prefixes, navigates straight to anything that looks like a URL, and offers
 * matching bookmarks from every page as you type.
 */
export const SearchBar = forwardRef<HTMLInputElement, Props>(function SearchBar(
  { engineId, onEngineChange, size = 'md', autoFocus, className },
  ref
) {
  const { t } = useTranslation();
  const { pages, settings, updateSettings, visitBookmark } = useStore(useShallow((s) => ({
    pages: s.pages,
    settings: s.settings,
    updateSettings: s.updateSettings,
    visitBookmark: s.visitBookmark,
  })));

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number>();

  const current = engineId ?? settings.searchEngine;
  const engine = engineById(current);

  const setEngine = (id: string) => {
    if (onEngineChange) onEngineChange(id);
    else updateSettings({ searchEngine: id });
  };

  /** Every bookmark across every page, flattened once per store change. */
  const allBookmarks = useMemo(() => {
    const out: { bookmark: Bookmark; pageTitle: string; widgetId: string }[] = [];
    const walk = (list: Bookmark[], pageTitle: string, widgetId: string) => {
      for (const bm of list) {
        if (bm.kind === 'link') out.push({ bookmark: bm, pageTitle, widgetId });
        if (bm.children) walk(bm.children, pageTitle, widgetId);
      }
    };
    for (const page of pages) {
      for (const column of page.columns) {
        for (const widget of column.widgets) {
          if (widget.config.bookmarks) {
            walk(widget.config.bookmarks, page.title, widget.id);
          }
        }
      }
    }
    return out;
  }, [pages]);

  const hits: (Hit & { widgetId: string })[] = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return allBookmarks
      .filter(
        ({ bookmark }) =>
          bookmark.title.toLowerCase().includes(term) ||
          bookmark.url?.toLowerCase().includes(term)
      )
      .slice(0, 6);
  }, [query, allBookmarks]);

  const go = (value: string) => {
    const { engine: bang, query: rest } = parseBang(value);
    const url = buildSearchUrl(bang ?? current, rest);
    if (!url) return;
    if (settings.openLinksInNewTab) window.open(url, '_blank', 'noreferrer');
    else location.assign(url);
  };

  const submit = () => {
    const term = query.trim();
    if (!term) return;
    // Enter on a highlighted bookmark opens that, not a web search.
    if (open && active > 0 && hits[active - 1]) {
      const hit = hits[active - 1];
      visitBookmark(hit.widgetId, hit.bookmark.id);
      if (settings.openLinksInNewTab) window.open(hit.bookmark.url, '_blank', 'noreferrer');
      else location.assign(hit.bookmark.url!);
      return;
    }
    go(term);
  };

  const big = size === 'lg';

  return (
    <div className={cx('relative', className)}>
      <div
        className={cx(
          'flex items-center gap-1 rounded-full bg-ink/[0.07] transition-colors',
          'focus-within:bg-ink/[0.12] focus-within:ring-1 focus-within:ring-accent/40',
          big ? 'h-12 pe-2 ps-4' : 'h-8 pe-1 ps-2.5'
        )}
      >
        <Menu
          align="start"
          trigger={(p) => (
            <button
              {...p}
              className="flex shrink-0 items-center gap-1 rounded-full px-1 py-1 text-ink-muted
                transition-colors hover:text-ink"
              aria-label={t('search.chooseEngine')}
              title={engine.name}
            >
              <Favicon url={`https://${engine.host}`} title={engine.name} className={big ? 'h-[18px] w-[18px]' : 'h-[15px] w-[15px]'} />
              <ChevronDown size={12} />
            </button>
          )}
        >
          <MenuLabel>{t('search.engine')}</MenuLabel>
          <div className="max-h-72 overflow-y-auto">
            {SEARCH_ENGINES.map((e) => (
              <MenuItem
                key={e.id}
                checked={e.id === current}
                icon={<Favicon url={`https://${e.host}`} title={e.name} className="h-[15px] w-[15px]" />}
                onClick={() => setEngine(e.id)}
              >
                {e.name}
              </MenuItem>
            ))}
          </div>
        </Menu>

        <input
          ref={ref}
          value={query}
          autoFocus={autoFocus}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('search.placeholder')}
          aria-label={t('common.search')}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so a click on a suggestion still registers.
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, hits.length));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Escape') {
              if (query) {
                e.stopPropagation();
                setQuery('');
              }
              setOpen(false);
            }
          }}
          className={cx(
            'min-w-0 flex-1 border-0 bg-transparent text-ink outline-none',
            'placeholder:text-ink-faint',
            big ? 'text-base' : 'text-[13px]'
          )}
        />

        {query && (
          <button
            className="btn-icon h-7 w-7 shrink-0"
            onClick={() => setQuery('')}
            aria-label={t('search.clear')}
          >
            <X size={15} />
          </button>
        )}
        <button
          className={cx(
            'grid shrink-0 place-items-center rounded-full bg-accent text-accent-fg',
            'transition-[filter] hover:brightness-110',
            big ? 'h-9 w-9' : 'h-6 w-6'
          )}
          onClick={submit}
          aria-label={t('search.submit')}
        >
          <Search size={big ? 17 : 13} />
        </button>
      </div>

      {open && !!hits.length && (
        <ul
          className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg
            border border-line bg-surface-raised py-1 shadow-pop animate-pop-in"
          onMouseDown={() => clearTimeout(blurTimer.current)}
        >
          <li className="px-3 pb-1 pt-0.5 text-2xs font-semibold uppercase tracking-wide
            text-ink-faint">
            {t('search.bookmarks')}
          </li>
          {hits.map((hit, i) => (
            <li key={hit.bookmark.id}>
              <a
                href={hit.bookmark.url}
                target={settings.openLinksInNewTab ? '_blank' : undefined}
                rel="noreferrer"
                onClick={() => visitBookmark(hit.widgetId, hit.bookmark.id)}
                onMouseEnter={() => setActive(i + 1)}
                className={cx(
                  'flex items-center gap-2.5 px-3 py-2 text-sm',
                  active === i + 1 ? 'bg-accent/10' : 'hover:bg-ink/5'
                )}
              >
                <Favicon url={hit.bookmark.url} icon={hit.bookmark.icon} title={hit.bookmark.title} className="h-[17px] w-[17px]" />
                <span className="truncate text-ink">{hit.bookmark.title}</span>
                <span className="ms-auto shrink-0 truncate text-2xs text-ink-faint">
                  {hit.pageTitle}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
