import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import type { Widget } from '../../store/types';
import { cx, escapeHtml } from '../../lib/util';
import { SegmentedControl } from '../ui/Controls';

interface Props {
  widget: Widget;
  editMode: boolean;
  /** True while the widget's settings panel is open. */
  configuring: boolean;
}

/** A plain-text scratchpad that grows with its content and saves as you type. */
export function NotesWidget({ widget }: Props) {
  const { t } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const [text, setText] = useState(widget.config.text ?? '');
  const area = useRef<HTMLTextAreaElement>(null);

  // Keep in step when the widget is edited elsewhere (undo, import, share).
  useEffect(() => setText(widget.config.text ?? ''), [widget.config.text]);

  // Debounced so a long note does not write to localStorage on every keypress.
  useEffect(() => {
    if (text === (widget.config.text ?? '')) return;
    const id = setTimeout(() => patch(widget.id, { text }), 400);
    return () => clearTimeout(id);
  }, [text, widget.id, widget.config.text, patch]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(96, el.scrollHeight)}px`;
  }, [text]);

  return (
    <div className="px-2.5 pb-2 pt-2">
      <textarea
        ref={area}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('notes.placeholder')}
        spellCheck
        className="w-full resize-none border-0 bg-transparent px-1 text-sm leading-relaxed
          text-ink outline-none placeholder:text-ink-faint"
      />
      {!!text.length && (
        <p className="px-1 pt-1 text-end text-2xs text-ink-faint">
          {t('notes.chars', { count: text.length })}
        </p>
      )}
    </div>
  );
}

/** Markdown-lite: bold, italic, code, links, lists and headings. */
function renderLite(src: string): string {
  const lines = escapeHtml(src).split('\n');
  const out: string[] = [];
  let inList = false;

  const inline = (s: string) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\W)\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code class="rounded bg-ink/10 px-1 py-0.5 text-2xs">$1</code>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noreferrer" class="text-accent underline">$1</a>'
      )
      .replace(
        /(^|\s)(https?:\/\/[^\s<]+)/g,
        '$1<a href="$2" target="_blank" rel="noreferrer" class="text-accent underline">$2</a>'
      );

  for (const line of lines) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!inList) {
        out.push('<ul class="my-1 list-disc space-y-0.5 ps-5">');
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const size = ['text-base', 'text-sm', 'text-xs'][heading[1].length - 1];
      out.push(`<p class="${size} mb-1 mt-2 font-semibold">${inline(heading[2])}</p>`);
      continue;
    }
    if (!line.trim()) {
      out.push('<div class="h-2"></div>');
      continue;
    }
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

/**
 * Rich text. The source is escaped before the tiny markdown pass runs, so
 * nothing a user (or an imported page) types can inject markup.
 */
export function HtmlWidget({ widget, editMode }: Props) {
  const { t } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(widget.config.text ?? '');

  useEffect(() => setText(widget.config.text ?? ''), [widget.config.text]);
  const html = useMemo(() => renderLite(widget.config.text ?? ''), [widget.config.text]);

  if (editing && editMode) {
    return (
      <div className="px-2.5 pb-2.5 pt-2">
        <textarea
          className="field min-h-[8rem] font-mono text-xs"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'**bold** *italic* `code`\n- list item\n[link](https://…)'}
        />
        <div className="mt-2 flex gap-2">
          <button
            className="btn-primary px-3 py-1.5 text-xs"
            onClick={() => {
              patch(widget.id, { text });
              setEditing(false);
            }}
          >
            {t('common.save')}
          </button>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEditing(false)}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3.5 pb-3 pt-2.5">
      <div
        className="text-sm leading-relaxed text-ink [&_p]:min-h-[1px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {editMode && (
        <button
          className="btn-ghost mt-2 px-2 py-1 text-xs"
          onClick={() => setEditing(true)}
        >
          {t('common.edit')}
        </button>
      )}
    </div>
  );
}

export function HeadingWidget({ widget, editMode }: Props) {
  const { t } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const cfg = widget.config;
  const level = cfg.level ?? 2;
  const align = cfg.align ?? 'start';
  const value = cfg.text ?? '';

  const sizes = { 1: 'text-xl', 2: 'text-base', 3: 'text-sm' } as const;
  const aligns = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;

  return (
    <div className="px-1.5 py-1.5">
      {editMode ? (
        <>
          <input
            value={value}
            onChange={(e) => patch(widget.id, { text: e.target.value })}
            placeholder={t('heading.text')}
            className={cx(
              'w-full rounded bg-transparent px-1.5 py-1 font-semibold text-ink outline-none',
              'hover:bg-ink/5 focus:bg-ink/5 placeholder:font-normal placeholder:text-ink-faint',
              sizes[level],
              aligns[align]
            )}
          />
          <div className="mt-1.5 flex gap-1.5 px-1">
            <SegmentedControl
              value={String(level) as '1' | '2' | '3'}
              onChange={(v) => patch(widget.id, { level: Number(v) as 1 | 2 | 3 })}
              options={[
                { value: '1', label: 'H1' },
                { value: '2', label: 'H2' },
                { value: '3', label: 'H3' },
              ]}
            />
            <SegmentedControl
              value={align}
              onChange={(v) => patch(widget.id, { align: v })}
              options={[
                { value: 'start', label: '⟸', title: t('align.start') },
                { value: 'center', label: '≡', title: t('align.center') },
                { value: 'end', label: '⟹', title: t('align.end') },
              ]}
            />
          </div>
        </>
      ) : (
        <p
          className={cx(
            'px-1.5 py-1 font-semibold text-ink',
            sizes[level],
            aligns[align]
          )}
        >
          {value}
        </p>
      )}
      <div className="mt-1 h-px bg-line" />
    </div>
  );
}

export function QuoteWidget({ widget, editMode }: Props) {
  const { t } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const cfg = widget.config;

  return (
    <div className="px-3.5 pb-3 pt-2.5">
      {editMode ? (
        <>
          <textarea
            className="field min-h-[4rem] italic"
            value={cfg.text ?? ''}
            placeholder={t('quote.text')}
            onChange={(e) => patch(widget.id, { text: e.target.value })}
          />
          <input
            className="field mt-1.5"
            value={cfg.author ?? ''}
            placeholder={t('quote.author')}
            onChange={(e) => patch(widget.id, { author: e.target.value })}
          />
        </>
      ) : (
        <blockquote className="border-s-2 border-accent ps-3">
          <p className="text-sm italic leading-relaxed text-ink">{cfg.text}</p>
          {cfg.author && (
            <footer className="mt-1.5 text-xs text-ink-muted">— {cfg.author}</footer>
          )}
        </blockquote>
      )}
    </div>
  );
}
