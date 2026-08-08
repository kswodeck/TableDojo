import Link from 'next/link';

const LINKS = [
  {
    heading: 'Learn',
    items: [
      { label: 'Blackjack basic strategy', href: '/learn/blackjack' },
      { label: 'Poker hand ranks', href: '/learn/poker' },
      { label: 'Farkle scoring', href: '/learn/farkle' },
    ],
  },
  {
    heading: 'Play',
    items: [
      { label: 'Practice blackjack', href: '/practice/blackjack' },
      { label: 'Practice poker', href: '/practice/poker' },
      { label: 'Practice farkle', href: '/practice/farkle' },
    ],
  },
  {
    heading: 'Compete',
    items: [
      { label: 'Leaderboard', href: '/leaderboard' },
      { label: 'Community', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-felt-500/25 bg-felt-950/60">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-lg font-bold text-brass-300">Table Dojo</p>
            <p className="mt-2 max-w-xs text-sm text-ink-400">
              Learn casino table games properly — practice for free, then put it to the test on the ranked
              leaderboard.
            </p>
          </div>

          {LINKS.map((group) => (
            <div key={group.heading}>
              <h2 className="mb-3 text-xs font-semibold tracking-[0.16em] text-ink-200 uppercase">{group.heading}</h2>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-ink-400 transition-colors hover:text-brass-300">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-felt-500/20 pt-6 text-xs text-ink-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Table Dojo. Play money only — no real-money gambling, no cash prizes.</p>
          <p>Built by Kris Swodeck.</p>
        </div>
      </div>
    </footer>
  );
}
