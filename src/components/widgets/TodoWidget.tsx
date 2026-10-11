import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, Flag, Plus, Trash2, X } from 'lucide-react';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import { useStore } from '../../store/useStore';
import type { TodoItem, Widget } from '../../store/types';
import { cx, uid } from '../../lib/util';

const PRIORITY_RING = {
  low: 'border-sky-400',
  normal: 'border-line',
  high: 'border-red-500',
} as const;

export function TodoWidget({ widget, configuring }: { widget: Widget; editMode: boolean; configuring: boolean }) {
  const { t, i18n } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const [input, setInput] = useState('');

  const cfg = widget.config;
  const todos = cfg.todos ?? [];

  const write = (next: TodoItem[]) => patch(widget.id, { todos: next });

  const add = () => {
    const text = input.trim();
    if (!text) return;
    write([
      ...todos,
      { id: uid('td'), text, done: false, createdAt: Date.now(), priority: 'normal' },
    ]);
    setInput('');
  };

  const update = (id: string, p: Partial<TodoItem>) =>
    write(todos.map((td) => (td.id === id ? { ...td, ...p } : td)));

  const visible = useMemo(
    () => (cfg.hideCompleted ? todos.filter((td) => !td.done) : todos),
    [todos, cfg.hideCompleted]
  );
  const openCount = todos.filter((td) => !td.done).length;
  const doneCount = todos.length - openCount;

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-2.5 pb-2.5 pt-2">
      <div className="flex items-center gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t('todo.placeholder')}
          className="field py-1.5 text-sm"
        />
        <button
          className="btn-icon h-8 w-8 shrink-0 bg-accent/10 text-accent hover:bg-accent/20"
          onClick={add}
          aria-label={t('common.add')}
        >
          <Plus size={16} />
        </button>
      </div>

      {!visible.length ? (
        <p className="py-5 text-center text-sm text-ink-faint">{t('todo.empty')}</p>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {visible.map((td) => {
            const overdue = !td.done && td.due && td.due < today;
            return (
              <li key={td.id} className="group/row flex items-start gap-2 rounded px-1 py-1 hover:bg-ink/5">
                <button
                  onClick={() => update(td.id, { done: !td.done })}
                  className={cx(
                    'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border-2 transition-colors',
                    td.done
                      ? 'border-accent bg-accent text-accent-fg'
                      : PRIORITY_RING[td.priority ?? 'normal']
                  )}
                  aria-label={td.text}
                  aria-pressed={td.done}
                >
                  {td.done && <Check size={11} strokeWidth={3} />}
                </button>

                <div className="min-w-0 flex-1">
                  <input
                    value={td.text}
                    onChange={(e) => update(td.id, { text: e.target.value })}
                    className={cx(
                      'w-full truncate rounded bg-transparent text-sm outline-none',
                      'focus:bg-ink/5',
                      td.done ? 'text-ink-faint line-through' : 'text-ink'
                    )}
                  />
                  {td.due && (
                    <span
                      className={cx(
                        'mt-0.5 inline-flex items-center gap-1 text-2xs',
                        overdue ? 'font-medium text-red-600' : 'text-ink-faint'
                      )}
                    >
                      <Calendar size={10} />
                      {dateFmt.format(new Date(td.due))}
                      {overdue && ` · ${t('todo.overdue')}`}
                    </span>
                  )}
                </div>

                <span className="flex shrink-0 items-center opacity-0 transition-opacity
                  group-hover/row:opacity-100 focus-within:opacity-100">
                  <Menu
                    trigger={(p) => (
                      <button {...p} className="btn-icon h-6 w-6" aria-label={t('common.options')}>
                        <Flag size={12} />
                      </button>
                    )}
                  >
                    <MenuLabel>{t('todo.priority')}</MenuLabel>
                    {(['high', 'normal', 'low'] as const).map((level) => (
                      <MenuItem
                        key={level}
                        checked={(td.priority ?? 'normal') === level}
                        onClick={() => update(td.id, { priority: level })}
                      >
                        {t(`todo.priority.${level}`)}
                      </MenuItem>
                    ))}
                    <MenuSeparator />
                    <MenuLabel>{t('todo.due')}</MenuLabel>
                    <div className="px-2.5 pb-2">
                      <input
                        type="date"
                        className="field py-1 text-xs"
                        value={td.due ?? ''}
                        onChange={(e) => update(td.id, { due: e.target.value || undefined })}
                      />
                    </div>
                  </Menu>
                  <button
                    className="btn-icon h-6 w-6 hover:text-red-600"
                    onClick={() => write(todos.filter((x) => x.id !== td.id))}
                    aria-label={t('common.delete')}
                  >
                    <X size={13} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {!!todos.length && (
        <footer className="mt-2 flex items-center justify-between border-t border-line pt-2
          text-2xs text-ink-faint">
          <span>
            {t('todo.remaining', { count: openCount })}
            {doneCount > 0 && ` · ${t('todo.completed', { count: doneCount })}`}
          </span>
          <span className="flex gap-1.5">
            {configuring && (
              <button
                className="hover:text-ink"
                onClick={() => patch(widget.id, { hideCompleted: !cfg.hideCompleted })}
              >
                {cfg.hideCompleted ? t('common.all') : t('todo.hideCompleted')}
              </button>
            )}
            {doneCount > 0 && (
              <button
                className="inline-flex items-center gap-1 hover:text-red-600"
                onClick={() => write(todos.filter((td) => !td.done))}
              >
                <Trash2 size={10} /> {t('todo.clearCompleted')}
              </button>
            )}
          </span>
        </footer>
      )}
    </div>
  );
}
