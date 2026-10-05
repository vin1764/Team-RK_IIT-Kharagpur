import type { ReactNode } from 'react';

/** Deck-style heading: a plum rounded "tab" title bar. */
export function TitleTab({
  children,
  as: Tag = 'h2',
  size = 'md',
  className = '',
}: {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  size?: 'lg' | 'md' | 'sm';
  className?: string;
}) {
  const sizes = { lg: 'text-3xl px-6 py-2.5', md: 'text-xl px-5 py-2', sm: 'text-base px-4 py-1.5' };
  return (
    <Tag className={`inline-block rounded-t-2xl rounded-b-md bg-plum font-display font-bold text-white shadow-sm ${sizes[size]} ${className}`}>
      {children}
    </Tag>
  );
}
