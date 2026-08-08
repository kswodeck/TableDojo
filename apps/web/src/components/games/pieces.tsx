'use client';

import Image from 'next/image';
import type { Card, DieValue } from '@tabledojo/game-logic';
import { cx } from '@/lib/format';

const CARD_BACK = '/images/cards/blueBackCard.webp';

const RANK_LABELS: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };
const SUIT_LABELS: Record<number, string> = { 1: 'spades', 2: 'hearts', 3: 'clubs', 4: 'diamonds' };

function cardLabel(card: Card): string {
  const rank = RANK_LABELS[card.rank] ?? String(card.rank);
  return `${rank} of ${SUIT_LABELS[card.suit] ?? 'unknown'}`;
}

/**
 * A playing card.
 *
 * `held` and `onToggleHold` turn it into a toggle button so it is reachable by
 * keyboard. The original made the card a `<div>` with an inline `onclick` and
 * no role, so hold-to-keep was mouse-only.
 */
export function PlayingCard({
  card,
  held,
  onToggleHold,
  disabled,
  dealDelayMs = 0,
}: {
  card?: Card | null;
  held?: boolean;
  onToggleHold?: () => void;
  disabled?: boolean;
  dealDelayMs?: number;
}) {
  const interactive = Boolean(onToggleHold) && !disabled;

  const face = (
    <span
      className={cx(
        'relative block aspect-[5/7] w-full overflow-hidden rounded-lg ring-1 transition-all duration-200',
        held ? 'ring-2 ring-brass-400 -translate-y-2' : 'ring-felt-500/30',
        interactive && 'hover:-translate-y-1 hover:ring-brass-300/70',
      )}
      style={dealDelayMs ? { animationDelay: `${dealDelayMs}ms` } : undefined}
    >
      <Image
        src={card ? `/images/cards/${card.id}.webp` : CARD_BACK}
        alt={card ? cardLabel(card) : 'Face-down card'}
        fill
        sizes="(max-width: 640px) 18vw, 120px"
        className={cx('object-contain', card && 'animate-flip')}
        priority={false}
      />
    </span>
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      {interactive ? (
        <button
          type="button"
          onClick={onToggleHold}
          aria-pressed={held}
          aria-label={card ? `${held ? 'Release' : 'Hold'} ${cardLabel(card)}` : 'Card'}
          className="w-full rounded-lg"
        >
          {face}
        </button>
      ) : (
        face
      )}
      {onToggleHold && (
        <span
          className={cx(
            'text-[0.7rem] font-bold tracking-[0.2em] transition-opacity',
            held ? 'text-brass-300 opacity-100' : 'opacity-0',
          )}
        >
          HELD
        </span>
      )}
    </div>
  );
}

export function CardRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-5 gap-2 sm:gap-3">{children}</div>;
}

/** A single die. Selectable dice become toggle buttons for Farkle. */
export function Die({
  value,
  selected,
  onToggle,
  disabled,
  scoring,
  size = 'md',
}: {
  value: DieValue;
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  scoring?: boolean;
  size?: 'sm' | 'md';
}) {
  const dimension = size === 'sm' ? 'h-10 w-10' : 'h-16 w-16 sm:h-20 sm:w-20';
  const image = (
    <Image
      src={`/images/${value}dice.webp`}
      alt={`Die showing ${value}`}
      width={80}
      height={80}
      className={cx(dimension, 'animate-tumble object-contain')}
    />
  );

  if (!onToggle) return <span className="inline-block">{image}</span>;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${selected ? 'Release' : 'Keep'} the die showing ${value}`}
      className={cx(
        'rounded-xl border-2 p-1 transition-all duration-150',
        selected
          ? 'border-brass-400 bg-brass-500/20 -translate-y-1.5'
          : scoring
            ? 'border-felt-500/50 hover:border-brass-300/70 hover:-translate-y-1'
            : 'border-transparent opacity-45',
        disabled && 'cursor-not-allowed',
      )}
    >
      {image}
    </button>
  );
}

export function Coin({ side }: { side: 'heads' | 'tails' }) {
  // Callers pass a changing `key` (the flip counter) to restart the animation;
  // deriving one here from Math.random would differ between server and client
  // render and break hydration.
  return (
    <Image
      src={`/images/${side}.webp`}
      alt={`Coin showing ${side}`}
      width={160}
      height={160}
      className="animate-tumble h-32 w-32 object-contain sm:h-40 sm:w-40"
    />
  );
}

/** The persistent coin balance readout. */
export function CoinCount({ coins, className }: { coins: number; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-semibold text-brass-300 tabular-nums', className)}>
      <Image src="/images/coins.webp" alt="" width={22} height={22} className="h-5 w-5" aria-hidden />
      {coins.toLocaleString()}
    </span>
  );
}
