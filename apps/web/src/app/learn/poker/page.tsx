import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { PageHeading, Panel } from '@/components/ui/surface';
import { PayTable } from '@/components/games/poker-table';

export const metadata: Metadata = {
  title: 'Video poker hand ranks',
  description: 'The Jacks or Better pay table and the handful of holding rules that most of the value comes from.',
};

const RULES = [
  ['Never break a made hand to chase a bigger one', 'A pat straight or flush is worth more than four cards to a royal, except when the royal draw keeps the flush intact.'],
  ['Keep a low pair over four to a straight', 'The pair improves far more often than the open-ended draw pays.'],
  ['Never hold a kicker with a pair', 'It reduces your chance of trips, a full house or quads for no gain.'],
  ['Always bet the maximum', 'The royal flush jackpot only applies at max bet. Playing fewer coins gives up a chunk of the return.'],
];

export default function LearnPokerPage() {
  return (
    <>
      <PageHeading
        eyebrow="Learn"
        title="Video poker: Jacks or Better"
        description="You are dealt five cards, hold what you want, and the rest are replaced once. A pair of jacks or better is the smallest paying hand."
        actions={<ButtonLink href="/practice/poker">Practise it</ButtonLink>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-xl font-bold">Pay table (9/6)</h2>
          <PayTable bet={5} />
        </Panel>

        <div className="space-y-5">
          <Panel>
            <h2 className="text-xl font-bold">Why 9/6 matters</h2>
            <p className="mt-3 text-ink-200">
              The name comes from the full house and flush payouts — 9 coins and 6 coins per coin bet. Those two rows
              are where casinos quietly shave the return; a 8/5 machine looks identical but pays noticeably less over
              time. This table is the full-pay version, which returns about 99.5% with perfect play.
            </p>
          </Panel>

          <Panel>
            <h2 className="text-xl font-bold">Holding rules that carry most of the value</h2>
            <ol className="mt-4 space-y-3">
              {RULES.map(([rule, why]) => (
                <li key={rule} className="border-l-2 border-brass-500/50 pl-4">
                  <strong className="block text-ink-50">{rule}</strong>
                  <span className="text-sm text-ink-400">{why}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
