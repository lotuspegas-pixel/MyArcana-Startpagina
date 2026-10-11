import { useEffect, useState } from 'react';
import { faviconProviderCount, faviconUrl } from '../../lib/favicon';
import { colorFromString, cx, initialsOf } from '../../lib/util';

interface Props {
  url?: string;
  title: string;
  /** Explicit icon URL from the bookmark, which wins over the resolver. */
  icon?: string;
  size?: number;
  className?: string;
  rounded?: 'sm' | 'md' | 'full';
}

/**
 * Shows a site's favicon, walking through the resolver providers on error and
 * finally drawing the title's initials on a colour derived from the host.
 */
export function Favicon({ url, title, icon, size = 20, className, rounded = 'sm' }: Props) {
  const [provider, setProvider] = useState(0);
  const [failed, setFailed] = useState(false);

  // A changed target deserves a fresh attempt at the first provider.
  useEffect(() => {
    setProvider(0);
    setFailed(false);
  }, [url, icon]);

  const src = icon || faviconUrl(url, Math.max(32, size * 2), provider);
  const radius =
    rounded === 'full' ? 'rounded-full' : rounded === 'md' ? 'rounded-md' : 'rounded';

  if (!src || failed) {
    return (
      <span
        className={cx(
          'grid shrink-0 place-items-center font-semibold text-white',
          radius,
          className
        )}
        style={{
          width: size,
          height: size,
          background: colorFromString(url || title),
          fontSize: Math.max(8, size * 0.42),
        }}
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
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cx('shrink-0 bg-white/60 object-contain', radius, className)}
      style={{ width: size, height: size }}
      onError={() => {
        if (icon) return setFailed(true);
        if (provider + 1 < faviconProviderCount) setProvider(provider + 1);
        else setFailed(true);
      }}
    />
  );
}
