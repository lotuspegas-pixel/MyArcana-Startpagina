export interface SearchEngine {
  id: string;
  name: string;
  /** `%s` is replaced by the URL-encoded query. */
  url: string;
  /** Suggestion endpoint (JSONP-free, CORS-friendly) or undefined. */
  suggest?: string;
  host: string;
}

/** The engine list start.me offers, plus a few extras people actually use. */
export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s', host: 'google.com' },
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s', host: 'bing.com' },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', host: 'duckduckgo.com' },
  { id: 'startpage', name: 'Startpage', url: 'https://www.startpage.com/sp/search?query=%s', host: 'startpage.com' },
  { id: 'ecosia', name: 'Ecosia', url: 'https://www.ecosia.org/search?q=%s', host: 'ecosia.org' },
  { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q=%s', host: 'search.brave.com' },
  { id: 'qwant', name: 'Qwant', url: 'https://www.qwant.com/?q=%s', host: 'qwant.com' },
  { id: 'yandex', name: 'Yandex', url: 'https://yandex.com/search/?text=%s', host: 'yandex.com' },
  { id: 'baidu', name: 'Baidu', url: 'https://www.baidu.com/s?wd=%s', host: 'baidu.com' },
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s', host: 'youtube.com' },
  { id: 'wikipedia', name: 'Wikipedia', url: 'https://www.wikipedia.org/search-redirect.php?search=%s', host: 'wikipedia.org' },
  { id: 'images', name: 'Google Images', url: 'https://www.google.com/search?tbm=isch&q=%s', host: 'google.com' },
  { id: 'maps', name: 'Google Maps', url: 'https://www.google.com/maps/search/%s', host: 'google.com' },
  { id: 'news', name: 'Google News', url: 'https://news.google.com/search?q=%s', host: 'news.google.com' },
  { id: 'translate', name: 'Google Translate', url: 'https://translate.google.com/?text=%s', host: 'translate.google.com' },
  { id: 'scholar', name: 'Google Scholar', url: 'https://scholar.google.com/scholar?q=%s', host: 'scholar.google.com' },
  { id: 'amazon', name: 'Amazon', url: 'https://www.amazon.com/s?k=%s', host: 'amazon.com' },
  { id: 'ebay', name: 'eBay', url: 'https://www.ebay.com/sch/i.html?_nkw=%s', host: 'ebay.com' },
  { id: 'github', name: 'GitHub', url: 'https://github.com/search?q=%s', host: 'github.com' },
  { id: 'stackoverflow', name: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=%s', host: 'stackoverflow.com' },
  { id: 'reddit', name: 'Reddit', url: 'https://www.reddit.com/search/?q=%s', host: 'reddit.com' },
  { id: 'x', name: 'X', url: 'https://x.com/search?q=%s', host: 'x.com' },
  { id: 'linkedin', name: 'LinkedIn', url: 'https://www.linkedin.com/search/results/all/?keywords=%s', host: 'linkedin.com' },
  { id: 'pinterest', name: 'Pinterest', url: 'https://www.pinterest.com/search/pins/?q=%s', host: 'pinterest.com' },
  { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com/search/%s', host: 'spotify.com' },
  { id: 'imdb', name: 'IMDb', url: 'https://www.imdb.com/find/?q=%s', host: 'imdb.com' },
  { id: 'marktplaats', name: 'Marktplaats', url: 'https://www.marktplaats.nl/q/%s/', host: 'marktplaats.nl' },
  { id: 'bol', name: 'bol.com', url: 'https://www.bol.com/nl/nl/s/?searchtext=%s', host: 'bol.com' },
];

export const engineById = (id: string) =>
  SEARCH_ENGINES.find((e) => e.id === id) ?? SEARCH_ENGINES[0];

export function buildSearchUrl(engineId: string, query: string): string {
  const q = query.trim();
  // A bare domain or URL typed into the search box should just navigate there.
  if (/^(https?:\/\/|[\w-]+(\.[\w-]+)+(\/|$))/i.test(q) && !/\s/.test(q)) {
    return q.startsWith('http') ? q : `https://${q}`;
  }
  return engineById(engineId).url.replace('%s', encodeURIComponent(q));
}

/** `!g query` style bang prefixes, mapped onto our engine ids. */
export const BANGS: Record<string, string> = {
  g: 'google',
  b: 'bing',
  d: 'duckduckgo',
  ddg: 'duckduckgo',
  sp: 'startpage',
  e: 'ecosia',
  q: 'qwant',
  yt: 'youtube',
  w: 'wikipedia',
  i: 'images',
  m: 'maps',
  n: 'news',
  t: 'translate',
  s: 'scholar',
  a: 'amazon',
  gh: 'github',
  so: 'stackoverflow',
  r: 'reddit',
  x: 'x',
  li: 'linkedin',
  sf: 'spotify',
  mp: 'marktplaats',
  bol: 'bol',
};

/** Splits a leading `!bang` off the query. */
export function parseBang(input: string): { engine?: string; query: string } {
  const m = /^!([a-z]{1,4})\s+(.*)$/i.exec(input.trim());
  if (m && BANGS[m[1].toLowerCase()]) {
    return { engine: BANGS[m[1].toLowerCase()], query: m[2] };
  }
  return { query: input };
}
