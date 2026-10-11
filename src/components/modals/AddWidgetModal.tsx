import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CATEGORY_ORDER, WIDGETS, type WidgetCategory } from '../widgets/registry';
import { useStore } from '../../store/useStore';
import { cx } from '../../lib/util';

interface Props {
  /** The column that will receive the widget, or null when closed. */
  columnId: string | null;
  pageId: string;
  onClose: () => void;
}

export function AddWidgetModal({ columnId, pageId, onClose }: Props) {
  const { t } = useTranslation();
  const addWidget = useStore((s) => s.addWidget);
  const updateWidget = useStore((s) => s.updateWidget);
  const [category, setCategory] = useState<WidgetCategory | 'all'>('popular');
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return WIDGETS.filter((w) => {
      if (term) {
        const haystack = [
          w.type,
          t(`widget.${w.type}`),
          t(`widget.${w.type}.desc`),
          ...(w.keywords ?? []),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      }
      return category === 'all' || w.categories.includes(category);
    });
  }, [query, category, t]);

  if (!columnId) return null;

  const pick = (meta: (typeof WIDGETS)[number]) => {
    const id = addWidget(pageId, columnId, meta.type, t(`widget.${meta.type}`));
    // A search box or heading reads better without a widget header.
    if (meta.bareByDefault) updateWidget(id, { bare: true });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={t('widget.library')}
      description={t('widget.addTo')}
    >
      <div className="sticky -top-4 z-10 -mx-5 -mt-4 mb-4 bg-surface-raised px-5 pb-3 pt-4">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            className="field ps-9"
            autoFocus
            value={query}
            placeholder={t('widget.search')}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {!query && (
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
            {(['all', ...CATEGORY_ORDER] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cx(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  category === c
                    ? 'bg-accent text-accent-fg'
                    : 'bg-ink/[0.06] text-ink-muted hover:bg-ink/10 hover:text-ink'
                )}
              >
                {t(`widgetCat.${c}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {!results.length ? (
        <p className="py-8 text-center text-sm text-ink-faint">{t('search.noResults')}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((w) => {
            const Icon = w.icon;
            return (
              <li key={w.type}>
                <button
                  onClick={() => pick(w)}
                  className="group flex h-full w-full items-start gap-3 rounded-lg border
                    border-line bg-surface p-3 text-start transition-colors
                    hover:border-accent/50 hover:bg-accent/5"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent/10
                      text-accent transition-colors group-hover:bg-accent group-hover:text-accent-fg"
                  >
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">
                      {t(`widget.${w.type}`)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                      {t(`widget.${w.type}.desc`)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
