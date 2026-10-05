import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

/**
 * Every in-app navigation goes through this link. `data-nav` marks it for the
 * e2e link crawler; `next` marks the page's "next" path.
 */
export function Go({
  to,
  children,
  className = '',
  next = false,
  nav = false,
  label,
  onClick,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  next?: boolean;
  /** Render as a NavLink (active styling via aria-current). */
  nav?: boolean;
  label?: string;
  onClick?: () => void;
}) {
  const props = {
    to,
    'data-nav': to,
    ...(next ? { 'data-next': true } : {}),
    'aria-label': label,
    onClick,
  };
  return nav ? (
    <NavLink {...props} end={to === '/'} className={className}>
      {children}
    </NavLink>
  ) : (
    <Link {...props} className={className}>
      {children}
    </Link>
  );
}
