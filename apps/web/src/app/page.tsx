'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ButtonLink } from '@/components/ui/button';
import { CoinCount } from '@/components/games/pieces';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/surface';

const GAMES = [
  {
    name: 'Blackjack',
    tagline: 'The one game where correct play is a solved problem.',
    detail: 'Six decks, dealer stands on soft 17. Practice mode grades every decision against basic strategy.',
    practice: '/practice/blackjack',
    compete: '/compete/blackjack',
    learn: '/learn/blackjack',
    art: '/images/cards/1-1.webp',
  },
  {
    name: 'Video Poker',
    tagline: 'Jacks or Better, on a proper 9/6 pay table.',
    detail: 'Draw five, hold what counts, and learn which pairs are worth keeping.',
    practice: '/practice/poker',
    compete: '/compete/poker',
    learn: '/learn/poker',
    art: '/images/cards/13-2.webp',
  },
  {
    name: 'Farkle',
    tagline: 'Press your luck, or bank what you have.',
    detail: 'Six dice, hot-dice runs, and a scoring table that rewards knowing when to stop.',
    practice: '/practice/farkle',
    compete: '/compete/farkle',
    learn: '/learn/farkle',
    art: '/images/5dice.webp',
  },
];

const STEPS = [
  { title: 'Learn the rules', body: 'Short, plain-language guides for every game — no jargon walls.' },
  { title: 'Practise for free', body: 'Unlimited play with no coins at stake, and hints when you want them.' },
  { title: 'Climb the board', body: 'Wager coins in ranked mode and see where you land against everyone else.' },
];

export default function HomePage() {
  const { user, loading, bonus, dismissBonus } = useAuth();

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-felt-500/25 px-6 py-14 text-center sm:px-12 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,var(--color-felt-600),transparent)] opacity-60"
        />
        <Badge tone="gold">Play money only — never real stakes</Badge>

        <h1 className="mt-5 text-4xl font-bold text-balance sm:text-6xl">
          Get good at the table,
          <br />
          <span className="text-brass-300">before you sit at one.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-ink-200">
          Table Dojo teaches casino card and table games the way they are actually played. Practise free, check
          your decisions against the maths, then compete for a place on the leaderboard.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {loading ? (
            <div className="h-13 w-72 animate-pulse rounded-lg bg-felt-700/50" />
          ) : user ? (
            <>
              <ButtonLink href="/compete/blackjack" size="lg">
                Play ranked blackjack
              </ButtonLink>
              <ButtonLink href="/leaderboard" variant="secondary" size="lg">
                View leaderboard
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/practice/blackjack" size="lg">
                Start practising — no account
              </ButtonLink>
              <ButtonLink href="/register" variant="secondary" size="lg">
                Create an account
              </ButtonLink>
            </>
          )}
        </div>

        {user && (
          <p className="mt-6 text-sm text-ink-400">
            Welcome back, <span className="font-semibold text-ink-50">{user.username}</span> — you have{' '}
            <CoinCount coins={user.coins} className="text-sm" /> and a {user.loginStreak}-day streak.
          </p>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold sm:text-3xl">Three games, three ways to play each</h2>
        <p className="mt-2 text-ink-400">Every game has a guide, a free practice table, and a ranked table.</p>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {GAMES.map((game) => (
            <article key={game.name} className="surface group flex flex-col p-6 transition-colors hover:border-brass-400/40">
              <Image src={game.art} alt="" width={64} height={90} className="mb-4 h-20 w-auto drop-shadow-lg" aria-hidden />
              <h3 className="text-xl font-bold text-ink-50">{game.name}</h3>
              <p className="mt-1 text-sm font-medium text-brass-300">{game.tagline}</p>
              <p className="mt-3 flex-1 text-sm text-ink-400">{game.detail}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink href={game.practice} size="sm">
                  Practise
                </ButtonLink>
                <ButtonLink href={game.compete} variant="secondary" size="sm">
                  Ranked
                </ButtonLink>
                <Link href={game.learn} className="self-center px-1 text-sm text-ink-400 underline-offset-4 hover:text-brass-300 hover:underline">
                  Rules
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
        <ol className="mt-6 grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="surface p-6">
              <span className="font-display text-3xl font-bold text-brass-500/70">{index + 1}</span>
              <h3 className="mt-2 text-lg font-semibold text-ink-50">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The daily bonus, which the old site announced with a flash-message dialog. */}
      <Modal
        open={Boolean(bonus)}
        onClose={dismissBonus}
        title={`Day ${bonus?.streak ?? 0} of your streak`}
        size="sm"
        footer={
          <ButtonLink href="/compete/blackjack" size="sm" onClick={dismissBonus}>
            Put it to work
          </ButtonLink>
        }
      >
        <p className="flex items-center gap-2 text-lg">
          You collected <CoinCount coins={bonus?.coins ?? 0} />
        </p>
        <p className="text-sm text-ink-400">Sign in tomorrow to keep the streak going — the bonus grows each day.</p>
      </Modal>
    </>
  );
}
