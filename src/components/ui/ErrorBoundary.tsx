import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18next from 'i18next';

interface State {
  error: Error | null;
}

/**
 * A render error must never cost someone their start page, so the fallback
 * keeps localStorage untouched and only offers a reload.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('myArcana crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const t = i18next.t.bind(i18next);
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-widget bg-surface p-6 shadow-pop">
          <h1 className="text-lg font-semibold text-ink">{t('error.crash')}</h1>
          <p className="mt-2 text-sm text-ink-muted">{t('error.crashHint')}</p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-surface-sunken p-3 text-2xs text-ink-faint">
            {error.message}
          </pre>
          <button className="btn-primary mt-4 w-full" onClick={() => location.reload()}>
            {t('error.reload')}
          </button>
        </div>
      </div>
    );
  }
}
