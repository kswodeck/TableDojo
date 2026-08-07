'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { cx } from '@/lib/format';
import { CoinCount } from '@/components/games/pieces';
import { ButtonLink } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; note?: string }[];
}

const NAV: NavItem[] = [
  {
    label: 'Blackjack',
    href: '/practice/blackjack',
    children: [
      { label: 'Practice', href: '/practice/blackjack', note: 'Free play with strategy hints' },
      { label: 'Ranked', href: '/compete/blackjack', note: 'Wager coins, climb the board' },
      { label: 'Basic strategy', href: '/learn/blackjack', note: 'The chart, explained' },
    ],
  },
  {
    label: 'Poker',
    href: '/practice/poker',
    children: [
      { label: 'Practice', href: '/practice/poker', note: 'Free play, no stakes' },
      { label: 'Ranked', href: '/compete/poker', note: 'Jacks or Better for coins' },
      { label: 'Hand ranks', href: '/learn/poker', note: 'Pay table and rankings' },
    ],
  },
  {
    label: 'Farkle',
    href: '/practice/farkle',
    children: [
      { label: 'Practice', href: '/practice/farkle', note: 'Solo or pass-and-play' },
      { label: 'Ranked', href: '/compete/farkle', note: 'Bank points for coins' },
      { label: 'Scoring', href: '/learn/farkle', note: 'The house scoring table' },
    ],
  },
  {
    label: 'More',
    href: '/leaderboard',
    children: [
      { label: 'Leaderboard', href: '/leaderboard' },
      { label: 'Community', href: '/blog' },
      { label: 'Dice roller', href: '/tools/dice' },
      { label: 'Coin flip', href: '/tools/coin' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

function Dropdown({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const active = item.children?.some((child) => pathname === child.href) ?? pathname === item.href;

  // Close on outside click and on Escape, which the original menu never did —
  // its dropdowns were CSS :hover only and unreachable by keyboard.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className={cx('rounded-md px-3 py-2 text-sm font-medium transition-colors', active ? 'text-brass-300' : 'text-ink-200 hover:text-brass-300')}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div ref={container} className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cx(
          'flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active || open ? 'text-brass-300' : 'text-ink-200 hover:text-brass-300',
        )}
      >
        {item.label}
        <span aria-hidden className={cx('text-[0.6rem] transition-transform', open && 'rotate-180')}>
          ▼
        </span>
      </button>

      {open && (
        <div className="surface animate-rise absolute left-0 top-full z-50 mt-1 w-64 p-1.5 shadow-table">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => setOpen(false)}
              className={cx(
                'block rounded-md px-3 py-2 transition-colors',
                pathname === child.href ? 'bg-felt-700 text-brass-300' : 'text-ink-200 hover:bg-felt-700/70 hover:text-ink-50',
              )}
            >
              <span className="block text-sm font-medium">{child.label}</span>
              {child.note && <span className="block text-xs text-ink-400">{child.note}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-felt-500/25 bg-felt-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/images/casinocompetitor-favicon.webp" alt="" width={32} height={32} className="h-8 w-8" aria-hidden />
          <span className="font-display text-lg font-bold tracking-tight text-brass-300">Table Dojo</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-0.5 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Dropdown key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {!loading && user && (
            <>
              <CoinCount coins={user.coins} className="hidden text-sm sm:inline-flex" />
              <Link href="/account" className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-felt-700">
                <Image
                  src={`/images/${user.profileImage}.webp`}
                  alt={`${user.username} profile`}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full ring-1 ring-brass-400/50"
                />
                <span className="hidden max-w-28 truncate text-sm font-medium text-ink-200 lg:inline">{user.username}</span>
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink-400 transition-colors hover:text-crimson-400 sm:block"
              >
                Sign out
              </button>
            </>
          )}

          {!loading && !user && (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:text-brass-300">
                Sign in
              </Link>
              <ButtonLink href="/register" size="sm">
                Sign up
              </ButtonLink>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation"
            className="rounded-md p-2 text-ink-200 transition-colors hover:bg-felt-700 md:hidden"
          >
            <span aria-hidden className="block text-lg leading-none">
              {mobileOpen ? '✕' : '☰'}
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-nav" aria-label="Main" className="animate-rise border-t border-felt-500/25 bg-felt-950 px-4 py-3 md:hidden">
          {NAV.map((item) => (
            <div key={item.label} className="border-b border-felt-500/15 py-2 last:border-0">
              <p className="px-1 py-1 text-xs font-semibold tracking-[0.16em] text-brass-400 uppercase">{item.label}</p>
              <div className="grid gap-0.5">
                {(item.children ?? [{ label: item.label, href: item.href }]).map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="rounded-md px-3 py-2 text-sm text-ink-200 transition-colors hover:bg-felt-800 hover:text-ink-50"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-3">
            {user ? (
              <>
                <ButtonLink href="/account" variant="secondary" size="sm">
                  My account
                </ButtonLink>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-crimson-400"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <ButtonLink href="/login" variant="secondary" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/register" size="sm">
                  Sign up
                </ButtonLink>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
