export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
}

/**
 * Yahoo's chart endpoint is the only quote source that is both keyless and
 * usable from a browser, and even then only through a relay. Callers must be
 * ready for this to fail — the widget shows a plain message when it does.
 */
const ENDPOINTS: ((symbol: string) => string)[] = [
  (s) => `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=1d&interval=1d`,
  (s) =>
    `https://api.allorigins.win/raw?url=${encodeURIComponent(
      `https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=1d&interval=1d`
    )}`,
];

interface YahooChart {
  chart?: {
    result?: {
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        currency?: string;
      };
    }[];
  };
}

export async function fetchQuote(symbol: string, signal?: AbortSignal): Promise<Quote> {
  let lastError: unknown = new Error('No endpoint succeeded');
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint(symbol), { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as YahooChart;
      const meta = data.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;
      const prev = meta?.chartPreviousClose ?? meta?.previousClose;
      if (typeof price !== 'number') throw new Error('No price');
      const change = typeof prev === 'number' ? price - prev : 0;
      return {
        symbol: meta?.symbol ?? symbol,
        price,
        change,
        changePercent: typeof prev === 'number' && prev !== 0 ? (change / prev) * 100 : 0,
        currency: meta?.currency,
      };
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Quote unavailable');
}
