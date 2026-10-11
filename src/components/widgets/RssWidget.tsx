import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Switch } from '../ui/Controls';
import { useStore } from '../../store/useStore';
import type { Widget } from '../../store/types';
import { FEED_PRESETS, fetchFeed, type Feed } from '../../lib/rss';
import { cx, hostOf } from '../../lib/util';

export function RssWidget({ widget, configuring }: { widget: Widget; editMode: boolean; configuring: boolean }) {
  const { t, i18n } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const openNewTab = useStore((s) => s.settings.openLinksInNewTab);
  const cfg = widget.config;
  const url = cfg.feedUrl ?? '';

  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) {
      setFeed(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchFeed(url, controller.signal)
      .then((f) => setFeed(f))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setFeed(null);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [url, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const items = (feed?.items ?? []).slice(0, cfg.feedLimit ?? 8);
  const relative = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });

  const ago = (stamp: number) => {
    const mins = Math.round((stamp - Date.now()) / 60000);
    if (Math.abs(mins) < 60) return relative.format(mins, 'minute');
    const hours = Math.round(mins / 60);
    if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
    return relative.format(Math.round(hours / 24), 'day');
  };

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      {configuring && (
        <div className="mb-2 space-y-1.5">
          <div className="flex gap-1.5">
            <input
              className="field py-1.5 text-xs"
              value={url}
              placeholder="https://…/rss.xml"
              onChange={(e) => patch(widget.id, { feedUrl: e.target.value.trim() })}
            />
            <button
              className="btn-icon h-8 w-8 shrink-0"
              onClick={refresh}
              aria-label={t('common.refresh')}
            >
              <RefreshCw size={14} className={cx(loading && 'animate-spin')} />
            </button>
          </div>
          <select
            className="field py-1.5 text-xs"
            value=""
            onChange={(e) => e.target.value && patch(widget.id, { feedUrl: e.target.value })}
          >
            <option value="">{t('rss.presets')}…</option>
            {FEED_PRESETS.map((p) => (
              <option key={p.url} value={p.url}>
                {p.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-1.5 text-2xs text-ink-muted">
              {t('rss.limit')}
              <input
                type="number"
                min={1}
                max={30}
                className="field w-16 py-1 text-xs"
                value={cfg.feedLimit ?? 8}
                onChange={(e) =>
                  patch(widget.id, { feedLimit: Math.max(1, Number(e.target.value) || 8) })
                }
              />
            </label>
          </div>
          <Switch
            checked={cfg.showImages !== false}
            onChange={(v) => patch(widget.id, { showImages: v })}
            label={t('rss.showImages')}
          />
          <Switch
            checked={cfg.showExcerpt === true}
            onChange={(v) => patch(widget.id, { showExcerpt: v })}
            label={t('rss.showExcerpt')}
          />
        </div>
      )}

      {loading && !items.length && (
        <div className="space-y-2 py-1">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-2">
              <div className="skeleton h-10 w-14 shrink-0" />
              <div className="flex-1 space-y-1.5 py-0.5">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-2.5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !items.length && (
        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2.5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink">{t('rss.error')}</p>
            <p className="mt-0.5 text-2xs text-ink-faint">{t('rss.errorHint')}</p>
            <button className="btn-ghost mt-1 px-2 py-1 text-2xs" onClick={refresh}>
              <RefreshCw size={11} /> {t('common.refresh')}
            </button>
          </div>
        </div>
      )}

      {!loading && !error && !items.length && url && (
        <p className="py-4 text-center text-xs text-ink-faint">{t('rss.empty')}</p>
      )}
      {!url && !configuring && (
        <p className="py-4 text-center text-xs text-ink-faint">{t('rss.feedUrlHint')}</p>
      )}

      <ul className="divide-y divide-line">
        {items.map((item, i) => (
          <li key={`${item.link}-${i}`}>
            <a
              href={item.link}
              target={openNewTab ? '_blank' : undefined}
              rel="noreferrer"
              className="flex gap-2.5 py-2 transition-colors hover:bg-ink/[0.04]"
            >
              {cfg.showImages !== false && item.image && (
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-11 w-16 shrink-0 rounded object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-medium leading-snug text-ink">
                  {item.title}
                </p>
                {cfg.showExcerpt && item.excerpt && (
                  <p className="mt-0.5 line-clamp-2 text-2xs text-ink-muted">{item.excerpt}</p>
                )}
                <p className="mt-0.5 flex gap-1.5 text-2xs text-ink-faint">
                  <span>{hostOf(item.link)}</span>
                  {cfg.showDates !== false && item.date && <span>· {ago(item.date)}</span>}
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
