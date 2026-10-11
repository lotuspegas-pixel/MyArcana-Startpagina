import { useEffect, useState } from 'react';
import { faviconProviderCount, faviconUrl } from '../../lib/favicon';
import { colorFromString, cx, initialsOf } from '../../lib/util';

interface Props {
  url?: string;
  title: string;
  /** Explicit icon URL from the bookmark, which wins over the resolver. */
  icon?: string;
  /**
   * Sizing classes for the box. Kept as classes rather than a number so the
   * same icon can be touch-sized on a phone and compact on a desktop.
   */
  className?: string;
  /** Pixel resolution to request from the resolver. */
  res?: number;
  rounded?: 'sm' | 'md' | 'full';
}

/**
 * Shows a site's favicon, walking through the resolver providers on error and
 * finally drawing the title's initials on a colour derived from the host, so
 * a bookmark is never a blank square.
 */
export function Favicon({ url, title, icon, className, res = 64, rounded = 'sm' }: Props) {
  const [provider, setProvider] = useState(0);
  const [failed, setFailed] = useState(false);

  // A changed target deserves a fresh attempt at the first provider.
  useEffect(() => {
    setProvider(0);
    setFailed(false);
  }, [url, icon]);

  const src = icon || faviconUrl(url, res, provider);
  const radius =
    rounded === 'full' ? 'rounded-full' : rounded === 'md' ? 'rounded-md' : 'rounded-[3px]';

  if (!src || failed) {
    return (
      <span
        className={cx(
          'grid shrink-0 place-items-center text-[0.6em] font-semibold leading-none text-white',
          radius,
          className
        )}
        style={{ background: colorFromString(url || title) }}
        aria-hidden
      >
        {initialsOf(title)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cx('shrink-0 bg-white/5 object-contain', radius, className)}
      onError={() => {
        if (icon) return setFailed(true);
        if (provider + 1 < faviconProviderCount) setProvider(provider + 1);
        else setFailed(true);
      }}
    />
  );
}
