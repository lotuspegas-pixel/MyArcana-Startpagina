import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, ArrowRightLeft, Plus, RefreshCw, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { SegmentedControl } from '../ui/Controls';
import { useStore } from '../../store/useStore';
import type { Widget } from '../../store/types';
import { evaluate, formatResult } from '../../lib/calc';
import { CURRENCIES, fetchRate } from '../../lib/rates';
import { fetchQuote, type Quote } from '../../lib/stocks';
import { cx } from '../../lib/util';

interface Props {
  widget: Widget;
  editMode: boolean;
  /** True while the widget's settings panel is open. */
  configuring: boolean;
}

/* ------------------------------------------------------------- calculator */

const KEYS = [
  ['C', '(', ')', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
];

export function CalculatorWidget() {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ expr: string; value: string }[]>([]);

  const live = useMemo(() => {
    if (!input.trim()) return '';
    try {
      return formatResult(evaluate(input), i18n.language);
    } catch {
      return '';
    }
  }, [input, i18n.language]);

  const press = (key: string) => {
    if (key === 'C') return setInput('');
    if (key === '⌫') return setInput((v) => v.slice(0, -1));
    if (key === '=') {
      if (!live) return;
      setHistory((h) => [{ expr: input, value: live }, ...h].slice(0, 6));
      setInput(live.replace(/[^\d.,\-]/g, ''));
      return;
    }
    setInput((v) => v + key);
  };

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            press('=');
          }
        }}
        placeholder="12 * (3 + 4)"
        inputMode="text"
        spellCheck={false}
        className="field text-end font-mono text-base"
        aria-label={t('widget.calculator')}
      />
      <p
        className={cx(
          'h-5 pe-1 pt-0.5 text-end text-sm tabular-nums',
          live ? 'text-ink-muted' : 'text-transparent'
        )}
      >
        {live ? `= ${live}` : '—'}
      </p>

      <div className="mt-1 grid grid-cols-4 gap-1">
        {KEYS.flat().map((key) => (
          <button
            key={key}
            onClick={() => press(key)}
            className={cx(
              'rounded-md py-2 text-sm font-medium transition-colors',
              key === '='
                ? 'bg-accent text-accent-fg hover:brightness-110'
                : /[÷×−+]/.test(key)
                  ? 'bg-accent/10 text-accent hover:bg-accent/20'
                  : key === 'C'
                    ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                    : 'bg-surface-sunken text-ink hover:bg-ink/10'
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {!!history.length && (
        <ul className="mt-2 border-t border-line pt-1.5 text-2xs">
          {history.map((h, i) => (
            <li key={i} className="flex justify-between gap-2 py-0.5">
              <button
                className="truncate text-ink-faint hover:text-ink"
                onClick={() => setInput(h.expr)}
              >
                {h.expr}
              </button>
              <span className="shrink-0 font-medium tabular-nums text-ink">{h.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- currency */

export function CurrencyWidget({ widget }: Props) {
  const { t, i18n } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const cfg = widget.config;
  const from = cfg.from ?? 'EUR';
  const to = cfg.to ?? 'USD';
  const amount = cfg.amount ?? 1;

  const [rate, setRate] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setRate(null);
    fetchRate(from, to, controller.signal)
      .then((r) => {
        setRate(r.rate);
        setDate(r.date);
      })
      .catch(() => !controller.signal.aborted && setError(true));
    return () => controller.abort();
  }, [from, to, nonce]);

  const money = (n: number) =>
    n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      <div className="flex items-end gap-1.5">
        <label className="flex-1">
          <span className="label">{t('currency.amount')}</span>
          <input
            type="number"
            min={0}
            step="any"
            className="field py-1.5 text-sm tabular-nums"
            value={amount}
            onChange={(e) => patch(widget.id, { amount: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="w-[5.5rem]">
          <span className="label">{t('currency.from')}</span>
          <select
            className="field py-1.5 text-xs"
            value={from}
            onChange={(e) => patch(widget.id, { from: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          className="btn-icon mb-0.5 h-8 w-8 shrink-0"
          onClick={() => patch(widget.id, { from: to, to: from })}
          aria-label={t('currency.swap')}
        >
          <ArrowRightLeft size={14} />
        </button>
        <label className="w-[5.5rem]">
          <span className="label">{t('currency.to')}</span>
          <select
            className="field py-1.5 text-xs"
            value={to}
            onChange={(e) => patch(widget.id, { to: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 rounded-md bg-surface-sunken px-3 py-2.5 text-center">
        {error ? (
          <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
            <AlertTriangle size={13} className="text-amber-600" /> {t('currency.error')}
          </p>
        ) : rate === null ? (
          <div className="skeleton mx-auto h-6 w-28" />
        ) : (
          <>
            <p className="text-xl font-semibold tabular-nums text-ink">
              {money(amount * rate)} <span className="text-sm font-normal text-ink-faint">{to}</span>
            </p>
            <p className="mt-0.5 text-2xs text-ink-faint">
              {t('currency.rate', {
                from,
                to,
                rate: rate.toLocaleString(i18n.language, { maximumFractionDigits: 4 }),
              })}
            </p>
          </>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-2xs text-ink-faint">
        <span>{date && !error ? t('currency.updated', { time: date }) : ''}</span>
        <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setNonce((n) => n + 1)}>
          <RefreshCw size={10} /> {t('common.refresh')}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- stocks */

export function StocksWidget({ widget, editMode, configuring }: Props) {
  const { t, i18n } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const symbols = widget.config.symbols ?? [];

  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!symbols.length) return;
    const controller = new AbortController();
    setLoading(true);
    const bad: string[] = [];
    Promise.all(
      symbols.map((symbol) =>
        fetchQuote(symbol, controller.signal)
          .then((q) => [symbol, q] as const)
          .catch(() => {
            bad.push(symbol);
            return null;
          })
      )
    )
      .then((pairs) => {
        if (controller.signal.aborted) return;
        setQuotes(Object.fromEntries(pairs.filter(Boolean) as [string, Quote][]));
        setFailed(bad);
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
    // The symbol list is small and stable; join it so the effect is stable too.
  }, [symbols.join(','), nonce]);

  const num = (n: number) =>
    n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const add = () => {
    const next = draft.trim().toUpperCase();
    if (!next) return;
    patch(widget.id, { symbols: [...new Set([...symbols, ...next.split(/[,\s]+/)])].filter(Boolean) });
    setDraft('');
  };

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      <ul className="divide-y divide-line">
        {symbols.map((symbol) => {
          const q = quotes[symbol];
          const up = (q?.change ?? 0) >= 0;
          return (
            <li key={symbol} className="group/row flex items-center gap-2 py-1.5">
              <span className="w-16 shrink-0 truncate text-xs font-semibold text-ink">
                {symbol}
              </span>
              {q ? (
                <>
                  <span className="flex-1 text-end text-sm tabular-nums text-ink">
                    {num(q.price)}
                  </span>
                  <span
                    className={cx(
                      'flex w-[5.5rem] shrink-0 items-center justify-end gap-1 text-2xs tabular-nums',
                      up ? 'text-emerald-600' : 'text-red-600'
                    )}
                  >
                    {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {up ? '+' : ''}
                    {num(q.change)} ({q.changePercent.toFixed(2)}%)
                  </span>
                </>
              ) : loading ? (
                <span className="skeleton h-3.5 flex-1" />
              ) : (
                <span className="flex-1 text-end text-2xs text-ink-faint">—</span>
              )}
              {editMode && (
                <button
                  className="btn-icon h-5 w-5 shrink-0 opacity-0 group-hover/row:opacity-100
                    hover:text-red-600"
                  onClick={() =>
                    patch(widget.id, { symbols: symbols.filter((s) => s !== symbol) })
                  }
                  aria-label={t('common.delete')}
                >
                  <X size={12} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {!!failed.length && !loading && (
        <p className="mt-1.5 flex items-start gap-1.5 rounded-md bg-amber-500/10 p-2 text-2xs text-ink-muted">
          <AlertTriangle size={12} className="mt-px shrink-0 text-amber-600" />
          <span>
            {t('stocks.error')} {t('stocks.manual')}
          </span>
        </p>
      )}

      {configuring && (
        <div className="mt-2 space-y-1">
          <div className="flex gap-1.5">
            <input
              className="field py-1.5 text-xs uppercase"
              value={draft}
              placeholder="AAPL, ASML.AS"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <button className="btn-icon h-8 w-8 shrink-0" onClick={add} aria-label={t('common.add')}>
              <Plus size={15} />
            </button>
            <button
              className="btn-icon h-8 w-8 shrink-0"
              onClick={() => setNonce((n) => n + 1)}
              aria-label={t('common.refresh')}
            >
              <RefreshCw size={14} className={cx(loading && 'animate-spin')} />
            </button>
          </div>
          <p className="text-2xs text-ink-faint">{t('stocks.symbolsHint')}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ chart */

export function ChartWidget({ widget, configuring }: Props) {
  const { t } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const cfg = widget.config;
  const series = cfg.series ?? [];
  const kind = cfg.chartKind ?? 'bar';
  const max = Math.max(1, ...series.map((s) => Math.abs(s.value)));
  const total = series.reduce((sum, s) => sum + Math.abs(s.value), 0) || 1;

  // A single accent-derived ramp keeps every chart on-theme.
  const tint = (i: number) => `color-mix(in oklab, rgb(var(--c-accent)) ${95 - i * 11}%, white)`;

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      {kind === 'bar' && (
        <div className="flex h-32 items-end gap-1.5 px-1">
          {series.map((s, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-2xs tabular-nums text-ink-muted">{s.value}</span>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${(Math.abs(s.value) / max) * 100}%`,
                  background: s.color ?? tint(i),
                  minHeight: 2,
                }}
              />
              <span className="w-full truncate text-center text-2xs text-ink-faint">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {kind === 'line' && (
        <svg viewBox="0 0 100 44" className="h-32 w-full" preserveAspectRatio="none" role="img">
          <polyline
            fill="none"
            stroke="rgb(var(--c-accent))"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={series
              .map((s, i) => {
                const x = series.length < 2 ? 50 : (i / (series.length - 1)) * 96 + 2;
                const y = 40 - (Math.abs(s.value) / max) * 36;
                return `${x},${y}`;
              })
              .join(' ')}
          />
          {series.map((s, i) => {
            const x = series.length < 2 ? 50 : (i / (series.length - 1)) * 96 + 2;
            const y = 40 - (Math.abs(s.value) / max) * 36;
            return <circle key={i} cx={x} cy={y} r="1.4" fill="rgb(var(--c-accent))" />;
          })}
        </svg>
      )}

      {kind === 'donut' && (
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 42 42" className="h-28 w-28 shrink-0 -rotate-90" role="img">
            {(() => {
              let offset = 0;
              return series.map((s, i) => {
                const share = (Math.abs(s.value) / total) * 100;
                const el = (
                  <circle
                    key={i}
                    cx="21"
                    cy="21"
                    r="15.9"
                    fill="transparent"
                    stroke={s.color ?? tint(i)}
                    strokeWidth="6"
                    strokeDasharray={`${share} ${100 - share}`}
                    strokeDashoffset={-offset}
                    pathLength={100}
                  />
                );
                offset += share;
                return el;
              });
            })()}
          </svg>
          <ul className="min-w-0 flex-1 space-y-0.5 text-2xs">
            {series.map((s, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ background: s.color ?? tint(i) }}
                />
                <span className="truncate text-ink-muted">{s.label}</span>
                <span className="ms-auto shrink-0 tabular-nums text-ink">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {configuring && (
        <div className="mt-2 space-y-1.5 border-t border-line pt-2">
          <SegmentedControl
            value={kind}
            onChange={(v) => patch(widget.id, { chartKind: v })}
            className="w-full"
            options={[
              { value: 'bar', label: t('chart.bar') },
              { value: 'line', label: t('chart.line') },
              { value: 'donut', label: t('chart.donut') },
            ]}
          />
          {series.map((s, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                className="field py-1 text-xs"
                value={s.label}
                placeholder={t('chart.label')}
                onChange={(e) =>
                  patch(widget.id, {
                    series: series.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x
                    ),
                  })
                }
              />
              <input
                type="number"
                className="field w-20 py-1 text-xs tabular-nums"
                value={s.value}
                onChange={(e) =>
                  patch(widget.id, {
                    series: series.map((x, j) =>
                      j === i ? { ...x, value: Number(e.target.value) || 0 } : x
                    ),
                  })
                }
              />
              <button
                className="btn-icon h-7 w-7 shrink-0 hover:text-red-600"
                onClick={() =>
                  patch(widget.id, { series: series.filter((_, j) => j !== i) })
                }
                aria-label={t('common.delete')}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <button
            className="btn-outline w-full px-2 py-1.5 text-xs"
            onClick={() =>
              patch(widget.id, { series: [...series, { label: '', value: 0 }] })
            }
          >
            <Plus size={13} /> {t('chart.addPoint')}
          </button>
        </div>
      )}
    </div>
  );
}
