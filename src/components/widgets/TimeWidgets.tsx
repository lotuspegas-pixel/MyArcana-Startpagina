import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Switch } from '../ui/Controls';
import { useStore } from '../../store/useStore';
import type { Widget } from '../../store/types';
import { cx, uid } from '../../lib/util';
import { useTicker } from '../../hooks/useTicker';

interface Props {
  widget: Widget;
  editMode: boolean;
  /** True while the widget's settings panel is open. */
  configuring: boolean;
}

/* ------------------------------------------------------------------- clock */

function AnalogFace({ date, size = 108 }: { date: Date; size?: number }) {
  const s = date.getSeconds();
  const m = date.getMinutes() + s / 60;
  const h = (date.getHours() % 12) + m / 60;
  const r = size / 2;
  const hand = (angle: number, length: number, width: number, color: string) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return (
      <line
        x1={r}
        y1={r}
        x2={r + Math.cos(rad) * length}
        y2={r + Math.sin(rad) * length}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      <circle cx={r} cy={r} r={r - 2} className="fill-surface-sunken stroke-line" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => {
        const rad = ((i * 30 - 90) * Math.PI) / 180;
        const outer = r - 7;
        const inner = r - (i % 3 === 0 ? 14 : 11);
        return (
          <line
            key={i}
            x1={r + Math.cos(rad) * inner}
            y1={r + Math.sin(rad) * inner}
            x2={r + Math.cos(rad) * outer}
            y2={r + Math.sin(rad) * outer}
            className="stroke-ink-faint"
            strokeWidth={i % 3 === 0 ? 2 : 1}
            strokeLinecap="round"
          />
        );
      })}
      {hand(h * 30, r * 0.5, 3.5, 'rgb(var(--c-ink))')}
      {hand(m * 6, r * 0.7, 2.5, 'rgb(var(--c-ink))')}
      {hand(s * 6, r * 0.78, 1, 'rgb(var(--c-accent))')}
      <circle cx={r} cy={r} r="2.5" fill="rgb(var(--c-accent))" />
    </svg>
  );
}

export function ClockWidget({ widget, configuring }: Props) {
  const { t, i18n } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const cfg = widget.config;
  const now = useTicker(cfg.showSeconds || cfg.analog ? 1000 : 15000);
  const date = new Date(now);

  const time = new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    second: cfg.showSeconds ? '2-digit' : undefined,
    hour12: cfg.format24 === false,
  }).format(date);

  const dateText = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);

  return (
    <div className="px-2.5 pb-3 pt-2">
      <div className="flex flex-col items-center gap-1 py-1.5">
        {cfg.analog ? (
          <AnalogFace date={date} />
        ) : (
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{time}</p>
        )}
        {cfg.showDate !== false && (
          <p className="text-xs capitalize text-ink-muted">{dateText}</p>
        )}
      </div>

      {configuring && (
        <div className="mt-1 border-t border-line pt-1">
          <Switch
            checked={!!cfg.analog}
            onChange={(v) => patch(widget.id, { analog: v })}
            label={t('clock.analog')}
          />
          <Switch
            checked={cfg.format24 !== false}
            onChange={(v) => patch(widget.id, { format24: v })}
            label={t('clock.format24')}
          />
          <Switch
            checked={!!cfg.showSeconds}
            onChange={(v) => patch(widget.id, { showSeconds: v })}
            label={t('clock.showSeconds')}
          />
          <Switch
            checked={cfg.showDate !== false}
            onChange={(v) => patch(widget.id, { showDate: v })}
            label={t('clock.showDate')}
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- world clock */

/** A broad, de-duplicated list of IANA zones for the picker. */
const ZONE_OPTIONS = [
  'Europe/Amsterdam', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
  'Europe/Rome', 'Europe/Lisbon', 'Europe/Moscow', 'Europe/Istanbul', 'Europe/Kyiv',
  'Africa/Lagos', 'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Nairobi',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Mexico_City', 'America/Bogota', 'America/Sao_Paulo',
  'America/Buenos_Aires', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka',
  'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Manila', 'Asia/Ho_Chi_Minh', 'Asia/Jerusalem',
  'Australia/Perth', 'Australia/Sydney', 'Pacific/Auckland', 'Pacific/Honolulu', 'UTC',
];

export function WorldClockWidget({ widget, editMode, configuring }: Props) {
  const { t, i18n } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const cfg = widget.config;
  const now = useTicker(15000);
  const zones = cfg.timeZones ?? [];

  const localOffset = -new Date(now).getTimezoneOffset() / 60;

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      <ul className="divide-y divide-line">
        {zones.map((z) => {
          let time = '—';
          let day = '';
          let offset = '';
          try {
            const d = new Date(now);
            time = new Intl.DateTimeFormat(i18n.language, {
              hour: '2-digit',
              minute: '2-digit',
              hour12: cfg.format24 === false,
              timeZone: z.tz,
            }).format(d);
            day = new Intl.DateTimeFormat(i18n.language, {
              weekday: 'short',
              timeZone: z.tz,
            }).format(d);
            // Derive the zone's UTC offset from its own formatted hour.
            const there = new Date(d.toLocaleString('en-US', { timeZone: z.tz }));
            const here = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
            const diff = Math.round((there.getTime() - here.getTime()) / 3600000);
            const delta = diff - localOffset;
            offset = delta === 0 ? '' : `${delta > 0 ? '+' : ''}${delta}h`;
          } catch {
            time = '—';
          }
          return (
            <li key={z.id} className="group/row flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                {editMode ? (
                  <input
                    value={z.label}
                    onChange={(e) =>
                      patch(widget.id, {
                        timeZones: zones.map((x) =>
                          x.id === z.id ? { ...x, label: e.target.value } : x
                        ),
                      })
                    }
                    className="w-full truncate rounded bg-transparent text-sm font-medium
                      text-ink outline-none focus:bg-ink/5"
                  />
                ) : (
                  <p className="truncate text-sm font-medium text-ink">{z.label}</p>
                )}
                <p className="truncate text-2xs text-ink-faint">
                  {day}
                  {offset && ` · ${offset}`}
                </p>
              </div>
              <span className="shrink-0 text-base font-semibold tabular-nums text-ink">
                {time}
              </span>
              {editMode && (
                <button
                  className="btn-icon h-6 w-6 shrink-0 opacity-0 group-hover/row:opacity-100
                    hover:text-red-600"
                  onClick={() =>
                    patch(widget.id, { timeZones: zones.filter((x) => x.id !== z.id) })
                  }
                  aria-label={t('common.delete')}
                >
                  <X size={13} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {configuring && (
        <div className="mt-2 flex items-center gap-1.5">
          <select
            className="field py-1.5 text-xs"
            value=""
            onChange={(e) => {
              const tz = e.target.value;
              if (!tz) return;
              patch(widget.id, {
                timeZones: [
                  ...zones,
                  { id: uid('tz'), label: tz.split('/').pop()!.replace(/_/g, ' '), tz },
                ],
              });
            }}
          >
            <option value="">{t('clock.addTimezone')}…</option>
            {ZONE_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <button
            className="btn-icon h-8 w-8 shrink-0"
            onClick={() => patch(widget.id, { format24: cfg.format24 === false })}
            title={t('clock.format24')}
          >
            {cfg.format24 === false ? '12' : '24'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- calendar */

/** ISO-8601 week number, which is what Dutch and most European users expect. */
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = d.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 86400000));
}

export function CalendarWidget({ widget, configuring }: Props) {
  const { t, i18n } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const globalWeekStart = useStore((s) => s.settings.weekStart);
  const cfg = widget.config;
  const weekStart = cfg.weekStart ?? globalWeekStart;
  const [offset, setOffset] = useState(0);

  const today = new Date();
  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);

  const { cells, weeks } = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const lead = (first.getDay() - weekStart + 7) % 7;
    const start = new Date(first);
    start.setDate(1 - lead);
    const list: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      list.push(d);
    }
    // Trim the trailing all-next-month week so short months don't gain a row.
    const trimmed = list.slice(0, list[35].getMonth() === view.getMonth() ? 42 : 35);
    const rows: number[] = [];
    for (let i = 0; i < trimmed.length; i += 7) rows.push(isoWeek(trimmed[i]));
    return { cells: trimmed, weeks: rows };
  }, [view, weekStart]);

  const dayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => {
      // 2024-01-07 is a Sunday, so (7 + index) walks a full week.
      const d = new Date(Date.UTC(2024, 0, 7 + ((weekStart + i) % 7)));
      return fmt.format(d).replace('.', '').slice(0, 2);
    });
  }, [i18n.language, weekStart]);

  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    year: 'numeric',
  }).format(view);

  const showWeeks = cfg.showWeekNumbers !== false;
  const isoToday = today.toDateString();

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      <header className="mb-1.5 flex items-center justify-between">
        <button className="btn-icon h-7 w-7" onClick={() => setOffset(offset - 1)} aria-label={t('common.back')}>
          <ChevronLeft size={15} className="flip-rtl" />
        </button>
        <button
          className="rounded px-2 py-0.5 text-sm font-semibold capitalize text-ink hover:bg-ink/5"
          onClick={() => setOffset(0)}
          title={t('common.today')}
        >
          {monthLabel}
        </button>
        <button className="btn-icon h-7 w-7" onClick={() => setOffset(offset + 1)} aria-label={t('common.next')}>
          <ChevronRight size={15} className="flip-rtl" />
        </button>
      </header>

      <div
        className="grid gap-y-0.5 text-center"
        style={{ gridTemplateColumns: `${showWeeks ? 'auto ' : ''}repeat(7, minmax(0,1fr))` }}
      >
        {showWeeks && <span className="pe-1 text-2xs text-ink-faint">{t('calendar.weekShort')}</span>}
        {dayNames.map((d, i) => (
          <span key={i} className="pb-0.5 text-2xs font-medium uppercase text-ink-faint">
            {d}
          </span>
        ))}

        {cells.map((d, i) => {
          const weekCell =
            showWeeks && i % 7 === 0 ? (
              <span className="pe-1 pt-1 text-2xs tabular-nums text-ink-faint">
                {weeks[i / 7]}
              </span>
            ) : null;
          const isThisMonth = d.getMonth() === view.getMonth();
          const isToday = d.toDateString() === isoToday;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <Fragment key={d.toISOString()}>
              {weekCell}
              <span
                className={cx(
                  'mx-auto grid h-6 w-6 place-items-center rounded-full text-xs tabular-nums',
                  isToday && 'bg-accent font-semibold text-accent-fg',
                  !isToday && isThisMonth && (isWeekend ? 'text-ink-muted' : 'text-ink'),
                  !isThisMonth && 'text-ink-faint/50'
                )}
              >
                {d.getDate()}
              </span>
            </Fragment>
          );
        })}
      </div>

      {configuring && (
        <div className="mt-2 border-t border-line pt-1">
          <Switch
            checked={showWeeks}
            onChange={(v) => patch(widget.id, { showWeekNumbers: v })}
            label={t('calendar.showWeekNumbers')}
          />
          <label className="mt-1 block">
            <span className="label">{t('calendar.weekStart')}</span>
            <select
              className="field py-1.5 text-xs"
              value={weekStart}
              onChange={(e) =>
                patch(widget.id, { weekStart: Number(e.target.value) as 0 | 1 | 6 })
              }
            >
              <option value={1}>{t('weekday.1')}</option>
              <option value={0}>{t('weekday.0')}</option>
              <option value={6}>{t('weekday.6')}</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- countdown */

export function CountdownWidget({ widget, configuring }: Props) {
  const { t } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const now = useTicker(1000);
  const target = widget.config.target ? new Date(widget.config.target).getTime() : NaN;

  const diff = target - now;
  const past = diff < 0;
  const abs = Math.abs(diff);
  const parts = [
    { value: Math.floor(abs / 86400000), label: t('countdown.days') },
    { value: Math.floor((abs / 3600000) % 24), label: t('countdown.hours') },
    { value: Math.floor((abs / 60000) % 60), label: t('countdown.minutes') },
    { value: Math.floor((abs / 1000) % 60), label: t('countdown.seconds') },
  ];

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      {Number.isNaN(target) ? (
        <p className="py-4 text-center text-sm text-ink-faint">{t('countdown.target')}</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1 py-1">
            {parts.map((p) => (
              <div
                key={p.label}
                className="rounded-md bg-surface-sunken py-1.5 text-center"
              >
                <p className="text-lg font-semibold tabular-nums leading-tight text-ink">
                  {p.value}
                </p>
                <p className="text-[0.6rem] uppercase tracking-wide text-ink-faint">
                  {p.label.slice(0, 3)}
                </p>
              </div>
            ))}
          </div>
          {past && (
            <p className="mt-1.5 text-center text-2xs text-ink-faint">
              {abs < 60000 ? t('countdown.now') : t('countdown.passed')}
            </p>
          )}
        </>
      )}

      {configuring && (
        <label className="mt-2 block border-t border-line pt-2">
          <span className="label">{t('countdown.target')}</span>
          <input
            type="datetime-local"
            className="field py-1.5 text-xs"
            value={widget.config.target ?? ''}
            onChange={(e) => patch(widget.id, { target: e.target.value })}
          />
        </label>
      )}
    </div>
  );
}
