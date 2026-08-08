import type { Metadata } from 'next';
import { CASUAL_MULTIPLIER, SCORE_UNITS, toPoints, tripletUnits, type DieValue } from '@tabledojo/game-logic';
import { ButtonLink } from '@/components/ui/button';
import { PageHeading, Panel } from '@/components/ui/surface';
import { Die } from '@/components/games/pieces';

export const metadata: Metadata = {
  title: 'Farkle scoring',
  description: 'The full Table Dojo Farkle scoring table, plus when to bank and when to push your luck.',
};

const points = (units: number) => toPoints(units, CASUAL_MULTIPLIER).toLocaleString();

const COMBINATIONS = [
  { name: 'Single 1', detail: 'Each one, on its own', value: points(SCORE_UNITS.singleOne) },
  { name: 'Single 5', detail: 'Each five, on its own', value: points(SCORE_UNITS.singleFive) },
  { name: 'Three of a kind', detail: 'Face value × 100 — so three 4s is 400', value: `${points(tripletUnits(2))}–${points(tripletUnits(6))}` },
  { name: 'Three 1s', detail: 'Ones always score individually, so three of them is 3 × 100', value: points(tripletUnits(1)) },
  { name: 'Four of a kind', detail: 'Any face', value: points(SCORE_UNITS.fourOfAKind) },
  { name: 'Five of a kind', detail: 'Any face', value: points(SCORE_UNITS.fiveOfAKind) },
  { name: 'Six of a kind', detail: 'Any face', value: points(SCORE_UNITS.sixOfAKind) },
  { name: 'Straight (1-2-3-4-5-6)', detail: 'All six dice', value: points(SCORE_UNITS.straight) },
  { name: 'Three pairs', detail: 'All six dice', value: points(SCORE_UNITS.threePairs) },
  { name: 'Two triplets', detail: 'All six dice', value: points(SCORE_UNITS.twoTriplets) },
];

const STRAIGHT: DieValue[] = [1, 2, 3, 4, 5, 6];

export default function LearnFarklePage() {
  return (
    <>
      <PageHeading
        eyebrow="Learn"
        title="Farkle scoring"
        description="Roll six dice, keep at least one scoring die, then choose: roll what is left, or bank what you have."
        actions={<ButtonLink href="/practice/farkle">Practise it</ButtonLink>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-xl font-bold">Scoring table</h2>
          <table className="w-full text-sm">
            <caption className="sr-only">Farkle scoring combinations</caption>
            <thead>
              <tr className="border-b border-felt-500/30 text-left text-xs tracking-[0.14em] text-ink-400 uppercase">
                <th scope="col" className="py-2 font-semibold">
                  Combination
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {COMBINATIONS.map((row) => (
                <tr key={row.name} className="border-b border-felt-500/15 last:border-0">
                  <th scope="row" className="py-2.5 text-left font-medium">
                    {row.name}
                    <span className="block text-xs font-normal text-ink-400">{row.detail}</span>
                  </th>
                  <td className="py-2.5 text-right font-bold tabular-nums text-brass-300">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 text-xs text-ink-400">
            In ranked play these same values are multiplied by your bet tier instead of 50, so a 10-coin bet pays
            one fiftieth of the practice numbers and a 50-coin bet pays one tenth.
          </p>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <h2 className="text-xl font-bold">How a turn works</h2>
            <ol className="mt-4 space-y-3 text-ink-200">
              {[
                ['Roll', 'Start with all six dice.'],
                ['Keep', 'Set aside at least one scoring die. Dead dice cannot be kept.'],
                ['Decide', 'Roll the remaining dice for more, or bank everything you have kept.'],
                ['Farkle', 'If a roll contains no scoring dice at all, the turn ends and you lose everything unbanked.'],
              ].map(([step, detail], index) => (
                <li key={step} className="flex gap-3">
                  <span className="font-display text-2xl font-bold text-brass-500/60">{index + 1}</span>
                  <span>
                    <strong className="block text-ink-50">{step}</strong>
                    <span className="text-sm text-ink-400">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel>
            <h2 className="text-xl font-bold">Hot dice</h2>
            <div className="my-4 flex flex-wrap gap-2">
              {STRAIGHT.map((value) => (
                <Die key={value} value={value} size="sm" />
              ))}
            </div>
            <p className="text-ink-200">
              If every die in a roll scores, you get all six back and keep accumulating on the same turn. That is
              where big scores come from — and where turns get lost, because the next roll can still farkle.
            </p>
          </Panel>

          <Panel>
            <h2 className="text-xl font-bold">When to bank</h2>
            <p className="mt-3 text-ink-200">
              With two dice left, roughly 44% of rolls farkle. With one die it is 67%. A rough rule: with three or
              fewer dice remaining and a few hundred points on the table, bank. The maths stops favouring another
              roll long before it feels like it does.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
