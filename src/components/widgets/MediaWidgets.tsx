import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ExternalLink, Plus, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Widget } from '../../store/types';
import { cx, hostOf, normalizeUrl, uid } from '../../lib/util';

interface Props {
  widget: Widget;
  editMode: boolean;
  /** True while the widget's settings panel is open. */
  configuring: boolean;
}

/**
 * Turns a page URL into something that can actually live in an iframe.
 * YouTube, Vimeo, Spotify and Google Maps all refuse their canonical URLs.
 */
export function embeddableUrl(input: string): string {
  const url = normalizeUrl(input);
  if (!url) return '';
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      if (u.pathname.startsWith('/playlist')) {
        const list = u.searchParams.get('list');
        if (list) return `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`;
      }
    }
    if (host === 'youtu.be') {
      return `https://www.youtube-nocookie.com/embed${u.pathname}`;
    }
    if (host === 'vimeo.com') {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
    if (host === 'open.spotify.com' && !u.pathname.startsWith('/embed')) {
      return `https://open.spotify.com/embed${u.pathname}`;
    }
    if (host === 'google.com' && u.pathname.startsWith('/maps')) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(
        u.pathname.replace('/maps/place/', '').replace('/maps/search/', '')
      )}&output=embed`;
    }
    return url;
  } catch {
    return url;
  }
}

export function EmbedWidget({ widget, configuring }: Props) {
  const { t } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const cfg = widget.config;
  const src = embeddableUrl(cfg.url ?? '');
  const height = Math.min(Math.max(cfg.height ?? 320, 120), 900);

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      {configuring && (
        <div className="mb-2 space-y-1.5">
          <input
            className="field py-1.5 text-xs"
            value={cfg.url ?? ''}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => patch(widget.id, { url: e.target.value.trim() })}
          />
          <label className="flex items-center gap-2 text-2xs text-ink-muted">
            {t('embed.height')}
            <input
              type="range"
              min={120}
              max={900}
              step={20}
              value={height}
              onChange={(e) => patch(widget.id, { height: Number(e.target.value) })}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink/15
                accent-accent"
            />
            <span className="w-10 text-end tabular-nums">{height}</span>
          </label>
          <p className="text-2xs text-ink-faint">{t('embed.urlHint')}</p>
        </div>
      )}

      {!src ? (
        <p className="py-6 text-center text-xs text-ink-faint">{t('embed.noUrl')}</p>
      ) : (
        <>
          <iframe
            src={src}
            title={widget.title}
            height={height}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
            className="w-full rounded-md bg-surface-sunken"
            style={{ height }}
          />
          <a
            href={cfg.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-2xs text-ink-faint hover:text-accent"
          >
            <ExternalLink size={10} /> {hostOf(cfg.url)}
          </a>
        </>
      )}
    </div>
  );
}

export function ImageWidget({ widget, configuring }: Props) {
  const { t } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const [broken, setBroken] = useState(false);
  const cfg = widget.config;

  useEffect(() => setBroken(false), [cfg.url]);

  const picture = cfg.url ? (
    <img
      src={cfg.url}
      alt={cfg.caption ?? widget.title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="w-full rounded-md object-cover"
    />
  ) : null;

  return (
    <div className={cx(widget.bare ? 'p-1.5' : 'px-2.5 pb-2.5 pt-2')}>
      {configuring && (
        <div className="mb-2 space-y-1.5">
          <input
            className="field py-1.5 text-xs"
            value={cfg.url ?? ''}
            placeholder={t('image.url')}
            onChange={(e) => patch(widget.id, { url: e.target.value.trim() })}
          />
          <input
            className="field py-1.5 text-xs"
            value={cfg.caption ?? ''}
            placeholder={t('image.caption')}
            onChange={(e) => patch(widget.id, { caption: e.target.value })}
          />
          <input
            className="field py-1.5 text-xs"
            value={cfg.link ?? ''}
            placeholder={t('image.link')}
            onChange={(e) => patch(widget.id, { link: e.target.value.trim() })}
          />
        </div>
      )}

      {!cfg.url || broken ? (
        <p className="py-6 text-center text-xs text-ink-faint">{t('image.noUrl')}</p>
      ) : cfg.link ? (
        <a href={normalizeUrl(cfg.link)} target="_blank" rel="noreferrer">
          {picture}
        </a>
      ) : (
        picture
      )}

      {cfg.caption && !broken && (
        <p className="mt-1.5 text-center text-2xs text-ink-muted">{cfg.caption}</p>
      )}
    </div>
  );
}

export function GalleryWidget({ widget, editMode, configuring }: Props) {
  const { t } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const cfg = widget.config;
  const images = cfg.images ?? [];
  const [index, setIndex] = useState(0);
  const [adding, setAdding] = useState('');

  const count = images.length;
  const current = images[Math.min(index, Math.max(0, count - 1))];

  // Advance on its own, unless the user is arranging the gallery.
  useEffect(() => {
    if (count < 2 || editMode) return;
    const ms = Math.max(2, cfg.interval ?? 6) * 1000;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ms);
    return () => clearInterval(id);
  }, [count, cfg.interval, editMode]);

  const step = (delta: number) => setIndex((i) => (i + delta + count) % count);

  const add = () => {
    const url = adding.trim();
    if (!url) return;
    patch(widget.id, { images: [...images, { id: uid('img'), url }] });
    setAdding('');
  };

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      {!count ? (
        <p className="py-6 text-center text-xs text-ink-faint">{t('gallery.empty')}</p>
      ) : (
        <div className="group/gal relative overflow-hidden rounded-md bg-surface-sunken">
          {current.link ? (
            <a href={normalizeUrl(current.link)} target="_blank" rel="noreferrer">
              <img src={current.url} alt={current.caption ?? ''} className="h-44 w-full object-cover" />
            </a>
          ) : (
            <img
              src={current.url}
              alt={current.caption ?? ''}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-44 w-full object-cover"
            />
          )}

          {count > 1 && (
            <>
              <button
                className="absolute start-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center
                  rounded-full bg-black/45 text-white opacity-0 transition-opacity
                  group-hover/gal:opacity-100"
                onClick={() => step(-1)}
                aria-label={t('common.back')}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                className="absolute end-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center
                  rounded-full bg-black/45 text-white opacity-0 transition-opacity
                  group-hover/gal:opacity-100"
                onClick={() => step(1)}
                aria-label={t('common.next')}
              >
                <ChevronRight size={15} />
              </button>
              <div className="absolute bottom-1.5 start-1/2 flex -translate-x-1/2 gap-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setIndex(i)}
                    aria-label={`${i + 1}`}
                    className={cx(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      i === index ? 'bg-white' : 'bg-white/45'
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {current.caption && (
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent
              px-2 pb-4 pt-6 text-2xs text-white">
              {current.caption}
            </p>
          )}
        </div>
      )}

      {configuring && (
        <div className="mt-2 space-y-1.5">
          <div className="flex gap-1.5">
            <input
              className="field py-1.5 text-xs"
              value={adding}
              placeholder={t('image.url')}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <button className="btn-icon h-8 w-8 shrink-0" onClick={add} aria-label={t('gallery.add')}>
              <Plus size={15} />
            </button>
          </div>
          <label className="flex items-center gap-2 text-2xs text-ink-muted">
            {t('gallery.interval')}
            <input
              type="number"
              min={2}
              max={60}
              className="field w-16 py-1 text-xs"
              value={cfg.interval ?? 6}
              onChange={(e) =>
                patch(widget.id, { interval: Math.max(2, Number(e.target.value) || 6) })
              }
            />
          </label>
          {!!count && (
            <ul className="flex flex-wrap gap-1">
              {images.map((img) => (
                <li key={img.id} className="group/thumb relative">
                  <img
                    src={img.url}
                    alt=""
                    className="h-9 w-12 rounded border border-line object-cover"
                  />
                  <button
                    className="absolute -end-1 -top-1 grid h-4 w-4 place-items-center rounded-full
                      bg-red-600 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100"
                    onClick={() =>
                      patch(widget.id, { images: images.filter((x) => x.id !== img.id) })
                    }
                    aria-label={t('common.delete')}
                  >
                    <X size={9} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
