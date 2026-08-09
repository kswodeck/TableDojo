import type { Metadata } from 'next';
import { basicStrategy, cardId, type Card, type Rank } from '@tabledojo/game-logic';
import { cx } from '@/lib/format';
import { ButtonLink } from '@/components/ui/button';
import { PageHeading, Panel } from '@/components/ui/surface';

export const metadata: Metadata = {
  title: 'Blackjack basic strategy',
  description:
    'The complete basic strategy chart for six-deck blackjack where the dealer stands on soft 17 — generated from the same engine that grades your practice hands.',
};

const UPCARDS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1];
const UPCARD_LABEL: Record<number, string> = { 1: 'A', 10: '10' };

const card = (rank: Rank): Card => ({ rank, suit: 1, id: cardId(rank, 1) });
const pairCard = (rank: Rank): Card => ({ rank, suit: 2, id: cardId(rank, 2) });

const ACTION_STYLE: Record<string, string> = {
  hit: 'bg-crimson-600/30 text-crimson-400',
  stand: 'bg-felt-500/30 text-emerald-200',
  double: 'bg-brass-500/25 text-brass-300',
  split: 'bg-sky-500/20 text-sky-300',
};

const ACTION_LETTER: Record<string, string> = { hit: 'H', stand: 'S', double: 'D', split: 'P' };

/** Rows are built by asking the engine, so the chart cannot drift from play. */
function buildRow(playerCards: Card[], context: { canDouble: boolean; canSplit: boolean }) {
  return UPCARDS.map((up) => basicStrategy(playerCards, card(up), context).ideal);
}

const HARD_TOTALS: { label: string; cards: Card[] }[] = [
  { label: '8 or less', cards: [card(3), card(5)] },
  { label: '9', cards: [card(4), card(5)] },
  { label: '10', cards: [card(4), card(6)] },
  { label: '11', cards: [card(5), card(6)] },
  { label: '12', cards: [card(10), card(2)] },
  { label: '13', cards: [card(10), card(3)] },
  { label: '14', cards: [card(10), card(4)] },
  { label: '15', cards: [card(10), card(5)] },
  { label: '16', cards: [card(10), card(6)] },
  { label: '17+', cards: [card(10), card(7)] },
];

const SOFT_TOTALS: { label: string; cards: Card[] }[] = [
  { label: 'A,2 (13)', cards: [card(1), card(2)] },
  { label: 'A,3 (14)', cards: [card(1), card(3)] },
  { label: 'A,4 (15)', cards: [card(1), card(4)] },
  { label: 'A,5 (16)', cards: [card(1), card(5)] },
  { label: 'A,6 (17)', cards: [card(1), card(6)] },
  { label: 'A,7 (18)', cards: [card(1), card(7)] },
  { label: 'A,8+ (19+)', cards: [card(1), card(8)] },
];

const PAIRS: { label: string; rank: Rank }[] = [
  { label: 'A,A', rank: 1 },
  { label: '2,2', rank: 2 },
  { label: '3,3', rank: 3 },
  { label: '4,4', rank: 4 },
  { label: '5,5', rank: 5 },
  { label: '6,6', rank: 6 },
  { label: '7,7', rank: 7 },
  { label: '8,8', rank: 8 },
  { label: '9,9', rank: 9 },
  { label: '10,10', rank: 10 },
];

function ChartTable({ title, rows }: { title: string; rows: { label: string; actions: string[] }[] }) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-bold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-separate border-spacing-0.5 text-center text-sm">
          <caption className="sr-only">{title} basic strategy</caption>
          <thead>
            <tr>
              <th scope="col" className="p-2 text-left text-xs tracking-wider text-ink-400 uppercase">
                You
              </th>
              {UPCARDS.map((up) => (
                <th key={up} scope="col" className="p-2 text-xs font-semibold text-ink-400">
                  {UPCARD_LABEL[up] ?? up}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="p-2 text-left text-xs font-semibold whitespace-nowrap text-ink-200">
                  {row.label}
                </th>
                {row.actions.map((action, index) => (
                  <td key={index} className={cx('rounded p-2 font-bold', ACTION_STYLE[action])} title={action}>
                    {ACTION_LETTER[action]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LearnBlackjackPage() {
  return (
    <>
      <PageHeading
        eyebrow="Learn"
        title="Blackjack basic strategy"
        description="Six decks, dealer stands on soft 17, double after split allowed, blackjack pays 3:2. Under these rules every hand has exactly one best play."
        actions={<ButtonLink href="/practice/blackjack">Practice it</ButtonLink>}
      />

      <div className="space-y-6">
        <Panel>
          <h2 className="text-xl font-bold">Why a chart exists at all</h2>
          <p className="mt-3 text-ink-200">
            Blackjack is the rare casino game where your decisions change the outcome. The dealer has no choices —
            they draw to 17 and stop. That makes the game solvable: for every combination of your cards and the
            dealer&rsquo;s upcard, one action returns more money over time than the others. That set of answers is
            &ldquo;basic strategy&rdquo;, and it cuts the house edge to roughly half a percent.
          </p>
          <p className="mt-3 text-ink-200">
            It will not make you win. It makes you lose more slowly than any other way of playing, which is the only
            honest promise a casino game can make.
          </p>
        </Panel>

        <Panel>
          <div className="mb-6 flex flex-wrap gap-3 text-xs">
            {(['hit', 'stand', 'double', 'split'] as const).map((action) => (
              <span key={action} className={cx('rounded px-2.5 py-1 font-bold capitalize', ACTION_STYLE[action])}>
                {ACTION_LETTER[action]} — {action}
              </span>
            ))}
          </div>

          <div className="space-y-8">
            <ChartTable
              title="Hard totals"
              rows={HARD_TOTALS.map((row) => ({
                label: row.label,
                actions: buildRow(row.cards, { canDouble: true, canSplit: false }),
              }))}
            />
            <ChartTable
              title="Soft totals (holding an ace)"
              rows={SOFT_TOTALS.map((row) => ({
                label: row.label,
                actions: buildRow(row.cards, { canDouble: true, canSplit: false }),
              }))}
            />
            <ChartTable
              title="Pairs"
              rows={PAIRS.map((row) => ({
                label: row.label,
                actions: buildRow([card(row.rank), pairCard(row.rank)], { canDouble: true, canSplit: true }),
              }))}
            />
          </div>

          <p className="mt-6 text-xs text-ink-400">
            Where the chart says double or split but the rules do not allow it — after a third card, or once you
            already hold four hands — fall back to hit, except on soft 18 where you stand.
          </p>
        </Panel>

        <Panel>
          <h2 className="text-xl font-bold">The four rules worth memorizing first</h2>
          <ol className="mt-4 space-y-3 text-ink-200">
            {[
              ['Always split aces and eights.', 'Two hands starting with an ace are strong; 16 is the worst hand there is.'],
              ['Never split tens or fives.', 'You already have 20. A pair of fives is a 10 — double it instead.'],
              ['Stand on 12–16 when the dealer shows 2–6.', 'They bust more than 40% of the time. Let them.'],
              ['Hit 12–16 when the dealer shows 7 or higher.', 'They are likely to make 17+, so a stiff hand has to improve.'],
            ].map(([rule, why]) => (
              <li key={rule} className="border-l-2 border-brass-500/50 pl-4">
                <strong className="block text-ink-50">{rule}</strong>
                <span className="text-sm text-ink-400">{why}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
