import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Droplets, MapPin, Search, Sunrise, Sunset, Wind } from 'lucide-react';
import { SegmentedControl } from '../ui/Controls';
import { useStore } from '../../store/useStore';
import type { Widget } from '../../store/types';
import {
  fetchWeather, searchPlaces, weatherEmoji,
  type GeoPlace, type WeatherReport,
} from '../../lib/weather';

export function WeatherWidget({ widget, configuring }: { widget: Widget; editMode: boolean; configuring: boolean }) {
  const { t, i18n } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const globalUnits = useStore((s) => s.settings.weatherUnits);
  const cfg = widget.config;
  const units = cfg.units ?? globalUnits;
  const days = cfg.forecastDays ?? 4;

  const [report, setReport] = useState<WeatherReport | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);

  const lat = cfg.latitude;
  const lon = cfg.longitude;

  useEffect(() => {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      setReport(null);
      return;
    }
    const controller = new AbortController();
    setError(false);
    fetchWeather(lat, lon, units, days, controller.signal)
      .then(setReport)
      .catch(() => !controller.signal.aborted && setError(true));
    // Refresh every 15 minutes so an always-open start page stays current.
    const timer = setInterval(() => {
      fetchWeather(lat, lon, units, days).then(setReport).catch(() => setError(true));
    }, 900_000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [lat, lon, units, days]);

  // Debounced place lookup while the user types.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    const id = setTimeout(() => {
      setSearching(true);
      searchPlaces(term, i18n.language, controller.signal)
        .then(setHits)
        .catch(() => !controller.signal.aborted && setHits([]))
        .finally(() => !controller.signal.aborted && setSearching(false));
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [query, i18n.language]);

  const choose = (p: GeoPlace) => {
    patch(widget.id, { place: p.name, latitude: p.latitude, longitude: p.longitude });
    setQuery('');
    setHits([]);
  };

  const timeFmt = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const dayFmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
  const deg = (n: number) => `${Math.round(n)}°`;

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      {configuring && (
        <div className="relative mb-2">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search
                size={13}
                className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2
                  text-ink-faint"
              />
              <input
                className="field py-1.5 ps-7 text-xs"
                value={query}
                placeholder={t('weather.searchPlace')}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <SegmentedControl
              value={units}
              onChange={(v) => patch(widget.id, { units: v })}
              options={[
                { value: 'metric', label: '°C' },
                { value: 'imperial', label: '°F' },
              ]}
            />
          </div>
          {(hits.length > 0 || searching) && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border
              border-line bg-surface-raised shadow-pop">
              {searching && !hits.length && (
                <li className="px-2.5 py-2 text-xs text-ink-faint">{t('common.loading')}</li>
              )}
              {hits.map((p) => (
                <li key={`${p.latitude},${p.longitude}`}>
                  <button
                    className="flex w-full items-center gap-2 px-2.5 py-2 text-start text-xs
                      hover:bg-ink/5"
                    onClick={() => choose(p)}
                  >
                    <MapPin size={12} className="shrink-0 text-ink-faint" />
                    <span className="truncate text-ink">{p.name}</span>
                    <span className="ms-auto shrink-0 text-ink-faint">
                      {p.admin1 ? `${p.admin1}, ` : ''}
                      {p.country}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {typeof lat !== 'number' ? (
        <p className="py-4 text-center text-xs text-ink-faint">{t('weather.noPlace')}</p>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-2.5">
          <AlertTriangle size={15} className="shrink-0 text-amber-600" />
          <p className="text-xs text-ink">{t('weather.error')}</p>
        </div>
      ) : !report ? (
        <div className="space-y-2 py-1">
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 py-1">
            <span className="text-4xl leading-none" aria-hidden>
              {weatherEmoji(report.now.code, report.now.isDay)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-semibold leading-tight tabular-nums text-ink">
                {deg(report.now.temperature)}
                <span className="ms-0.5 text-sm font-normal text-ink-faint">
                  {report.unit}
                </span>
              </p>
              <p className="truncate text-xs text-ink-muted">{cfg.place}</p>
            </div>
          </div>

          <div className="mt-1.5 grid grid-cols-3 gap-1 border-y border-line py-1.5 text-2xs">
            <span className="flex items-center gap-1 text-ink-muted">
              <span className="text-ink-faint">{t('weather.feelsLike')}</span>
              <span className="font-medium tabular-nums text-ink">
                {deg(report.now.apparent)}
              </span>
            </span>
            <span className="flex items-center gap-1 text-ink-muted">
              <Droplets size={11} className="text-ink-faint" />
              <span className="font-medium tabular-nums text-ink">{report.now.humidity}%</span>
            </span>
            <span className="flex items-center gap-1 text-ink-muted">
              <Wind size={11} className="text-ink-faint" />
              <span className="font-medium tabular-nums text-ink">
                {Math.round(report.now.wind)}
              </span>
            </span>
          </div>

          <ul className="mt-1.5 flex gap-1">
            {report.days.slice(0, days).map((d, i) => (
              <li
                key={d.date}
                className="flex-1 rounded-md bg-surface-sunken px-1 py-1.5 text-center"
              >
                <p className="text-2xs font-medium capitalize text-ink-muted">
                  {i === 0 ? t('common.today').slice(0, 3) : dayFmt.format(new Date(d.date))}
                </p>
                <p className="text-base leading-snug" aria-hidden>
                  {weatherEmoji(d.code)}
                </p>
                <p className="text-2xs tabular-nums text-ink">
                  <span className="font-semibold">{deg(d.max)}</span>
                  <span className="text-ink-faint"> {deg(d.min)}</span>
                </p>
              </li>
            ))}
          </ul>

          {(report.sunrise || report.sunset) && (
            <p className="mt-1.5 flex justify-center gap-3 text-2xs text-ink-faint">
              {report.sunrise && (
                <span className="flex items-center gap-1">
                  <Sunrise size={11} /> {timeFmt.format(new Date(report.sunrise))}
                </span>
              )}
              {report.sunset && (
                <span className="flex items-center gap-1">
                  <Sunset size={11} /> {timeFmt.format(new Date(report.sunset))}
                </span>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
