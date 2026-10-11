import type { Page } from '../store/types';

/**
 * Share links carry the page itself in the URL fragment, so a page can be
 * shared without any server. Fragments never leave the browser, which also
 * means a shared link reveals nothing to our host.
 */
const PREFIX = '#share=';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Browsers cope poorly with fragments beyond roughly this length. */
export const SHARE_LIMIT = 30_000;

export async function encodePage(page: Page): Promise<string | null> {
  const json = JSON.stringify({ v: 1, page });
  const source = new TextEncoder().encode(json);

  // CompressionStream turns a typical page into a fraction of its JSON size.
  const canCompress = 'CompressionStream' in globalThis;
  let bytes = source;
  if (canCompress) {
    const stream = new Response(
      new Blob([source as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'))
    );
    bytes = new Uint8Array(await stream.arrayBuffer());
  }

  const encoded = `${canCompress ? 'z' : 'r'}${toBase64Url(bytes)}`;
  const url = `${location.origin}${location.pathname}${PREFIX}${encoded}`;
  return url.length > SHARE_LIMIT ? null : url;
}

export async function decodeSharedPage(hash: string): Promise<Page | null> {
  if (!hash.startsWith(PREFIX)) return null;
  try {
    const payload = hash.slice(PREFIX.length);
    const compressed = payload[0] === 'z';
    let bytes = fromBase64Url(payload.slice(1));
    if (compressed) {
      if (!('DecompressionStream' in globalThis)) return null;
      const stream = new Response(
        new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      );
      bytes = new Uint8Array(await stream.arrayBuffer());
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { v?: number; page?: Page };
    if (!parsed.page || !Array.isArray(parsed.page.columns)) return null;
    return parsed.page;
  } catch {
    return null;
  }
}

export const clearShareHash = () => {
  history.replaceState(null, '', location.pathname + location.search);
};
