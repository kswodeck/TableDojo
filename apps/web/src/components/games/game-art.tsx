import Image from 'next/image';
import { cx } from '@/lib/format';

/**
 * Decorative artwork for the game cards on the home page.
 *
 * Each game gets a small fanned arrangement rather than a single flat image,
 * and the arrangement means something: blackjack shows an ace and a king (an
 * actual blackjack), poker shows three of the five cards in a royal flush.
 *
 * The pieces are laid out with `items-end` rather than the default `stretch`.
 * A bare `<img>` in a flex column stretches to the container width, which with
 * a fixed height squashes the aspect ratio — that is what these looked like
 * before.
 */
export type GameArtKind = 'blackjack' | 'poker' | 'farkle';

/** True pixel dimensions of the source art, so aspect ratios stay honest. */
const CARD = { width: 327, height: 500 };
const DIE = { width: 200, height: 200 };

interface Piece {
  src: string;
  dimensions: { width: number; height: number };
}

const ART: Record<GameArtKind, Piece[]> = {
  blackjack: [
    { src: '/images/cards/1-1.webp', dimensions: CARD },
    { src: '/images/cards/13-1.webp', dimensions: CARD },
  ],
  poker: [
    { src: '/images/cards/12-2.webp', dimensions: CARD },
    { src: '/images/cards/13-2.webp', dimensions: CARD },
    { src: '/images/cards/1-2.webp', dimensions: CARD },
  ],
  farkle: [
    { src: '/images/5dice.webp', dimensions: DIE },
    { src: '/images/1dice.webp', dimensions: DIE },
    { src: '/images/6dice.webp', dimensions: DIE },
  ],
};

/** Fans the pieces symmetrically about the center of the arrangement. */
function tilt(index: number, count: number): number {
  const step = count > 2 ? 11 : 8;
  return (index - (count - 1) / 2) * step;
}

export function GameArt({ kind, className }: { kind: GameArtKind; className?: string }) {
  const pieces = ART[kind];
  const isDice = kind === 'farkle';

  return (
    // Purely decorative: the game name is already the card's heading.
    <div aria-hidden className={cx('flex h-28 items-end justify-center', className)}>
      {pieces.map((piece, index) => (
        // Rotation lives on the wrapper and the hover lift on the image, because
        // an inline `transform` would override Tailwind's translate utility.
        <span
          key={piece.src}
          className={cx('origin-bottom', index > 0 && (isDice ? '-ml-3' : '-ml-7'))}
          style={{ transform: `rotate(${tilt(index, pieces.length)}deg)`, zIndex: index }}
        >
          <Image
            src={piece.src}
            alt=""
            width={piece.dimensions.width}
            height={piece.dimensions.height}
            className={cx(
              'w-auto drop-shadow-lg transition-transform duration-300 group-hover:-translate-y-1',
              isDice ? 'h-14' : 'h-24',
            )}
          />
        </span>
      ))}
    </div>
  );
}
