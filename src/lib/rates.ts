/**
 * Exchange rates from the keyless, CORS-enabled Frankfurter service, with a
 * second source as a fallback.
 */
export interface RateResult {
  rate: number;
  date: string;
}

export const CURRENCIES = [
  'EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY', 'HKD',
  'SGD', 'INR', 'IDR', 'KRW', 'TRY', 'RUB', 'BRL', 'MXN', 'ZAR', 'SEK',
  'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'ILS', 'AED', 'SAR', 'PKR',
  'BDT', 'THB', 'PHP', 'VND', 'MYR', 'NGN', 'EGP', 'KES', 'UAH', 'ISK',
];

export async function fetchRate(
  from: string,
  to: string,
  signal?: AbortSignal
): Promise<RateResult> {
  if (from === to) return { rate: 1, date: new Date().toISOString().slice(0, 10) };

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
      { signal }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = (await res.json()) as { rates?: Record<string, number>; date?: string };
    const rate = d.rates?.[to];
    if (typeof rate !== 'number') throw new Error('Rate missing');
    return { rate, date: d.date ?? '' };
  } catch (err) {
    if (signal?.aborted) throw err;
    const res = await fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from.toLowerCase()}.json`,
      { signal }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = (await res.json()) as Record<string, unknown>;
    const table = d[from.toLowerCase()] as Record<string, number> | undefined;
    const rate = table?.[to.toLowerCase()];
    if (typeof rate !== 'number') throw new Error('Rate missing');
    return { rate, date: String(d.date ?? '') };
  }
}
