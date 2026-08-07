'use client';

import { useCallback, useState } from 'react';
import {
  CASUAL_MULTIPLIER,
  FarkleRuleError,
  bank,
  keep,
  roll,
  startTurn,
  type TurnState,
} from '@tabledojo/game-logic';
import { Button, ButtonLink } from '@/components/ui/button';
import { Alert, Badge, PageHeading, Panel } from '@/components/ui/surface';
import { FarkleBoard } from '@/components/games/farkle-board';

/**
 * Free practice Farkle, including pass-and-play for a table of people sharing
 * one screen. Everything runs in the browser.
 */
export default function PracticeFarklePage() {
  const [players, setPlayers] = useState<string[]>(['Player 1']);
  const [scores, setScores] = useState<number[]>([0]);
  const [current, setCurrent] = useState(0);
  const [turn, setTurn] = useState<TurnState>(() => startTurn(CASUAL_MULTIPLIER));
  const [selected, setSelected] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const multiplayer = players.length > 1;

  const setPlayerCount = useCallback((count: number) => {
    setPlayers(Array.from({ length: count }, (_, index) => `Player ${index + 1}`));
    setScores(Array.from({ length: count }, () => 0));
    setCurrent(0);
    setTurn(startTurn(CASUAL_MULTIPLIER));
    setSelected([]);
    setNotice(null);
  }, []);

  const onRoll = useCallback(() => {
    setNotice(null);
    setSelected([]);
    const next = roll(turn);
    setTurn(next);
    if (next.status === 'farkled') {
      setNotice(`Farkle — ${players[current]} loses ${next.keeps.reduce((sum, k) => sum + k.points, 0).toLocaleString()} points this turn.`);
    }
  }, [turn, players, current]);

  const onKeep = useCallback(() => {
    try {
      setTurn(keep(turn, selected));
      setSelected([]);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof FarkleRuleError ? error.message : 'That selection is not valid.');
    }
  }, [turn, selected]);

  const endTurn = useCallback(
    (points: number) => {
      setScores((previous) => previous.map((score, index) => (index === current ? score + points : score)));
      setCurrent((index) => (index + 1) % players.length);
      setTurn(startTurn(CASUAL_MULTIPLIER));
      setSelected([]);
    },
    [current, players.length],
  );

  const onBank = useCallback(() => {
    try {
      const banked = bank(turn);
      setNotice(`${players[current]} banked ${banked.pendingPoints.toLocaleString()} points.`);
      endTurn(banked.pendingPoints);
    } catch (error) {
      setNotice(error instanceof FarkleRuleError ? error.message : 'Nothing to bank yet.');
    }
  }, [turn, players, current, endTurn]);

  const toggle = useCallback((index: number) => {
    setSelected((previous) =>
      previous.includes(index) ? previous.filter((value) => value !== index) : [...previous, index],
    );
  }, []);

  const farkled = turn.status === 'farkled';

  return (
    <>
      <PageHeading
        eyebrow="Practice"
        title="Farkle"
        description="Six dice. Keep what scores, roll the rest, and bank before your luck runs out."
        actions={
          <>
            <ButtonLink href="/learn/farkle" variant="ghost" size="sm">
              Scoring table
            </ButtonLink>
            <ButtonLink href="/compete/farkle" variant="secondary" size="sm">
              Play ranked
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <Panel>
          {notice && (
            <div className="mb-5">
              <Alert tone={farkled ? 'lose' : 'win'}>{notice}</Alert>
            </div>
          )}

          {multiplayer && (
            <p className="mb-5 text-center text-lg font-semibold text-brass-300">{players[current]}&rsquo;s turn</p>
          )}

          <FarkleBoard
            rolled={[...turn.rolled]}
            selected={selected}
            onToggle={toggle}
            category={turn.category}
            pendingPoints={turn.pendingPoints}
            diceAvailable={turn.diceAvailable}
            keeps={turn.keeps.map((k) => ({ dice: [...k.dice], points: k.points }))}
            multiplier={CASUAL_MULTIPLIER}
            status={turn.status}
          />

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {turn.status === 'awaiting-keep' && (
              <Button onClick={onKeep} disabled={selected.length === 0} size="lg">
                Keep {selected.length > 0 ? `${selected.length} ${selected.length === 1 ? 'die' : 'dice'}` : 'dice'}
              </Button>
            )}

            {turn.status === 'awaiting-roll' && (
              <>
                <Button onClick={onRoll} size="lg">
                  {turn.hotDice ? 'Hot dice — roll all six' : turn.keeps.length === 0 ? 'Roll' : `Roll ${turn.diceAvailable}`}
                </Button>
                {turn.pendingPoints > 0 && (
                  <Button onClick={onBank} variant="secondary" size="lg">
                    Bank {turn.pendingPoints.toLocaleString()}
                  </Button>
                )}
              </>
            )}

            {farkled && (
              <Button onClick={() => endTurn(0)} variant="secondary" size="lg">
                {multiplayer ? 'Next player' : 'New turn'}
              </Button>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <h2 className="mb-3 text-lg font-bold">Players</h2>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setPlayerCount(count)}
                  className={
                    players.length === count
                      ? 'rounded-lg border border-brass-400 bg-brass-500 px-3.5 py-1.5 text-sm font-bold text-felt-950'
                      : 'rounded-lg border border-felt-500/40 bg-felt-800/60 px-3.5 py-1.5 text-sm font-bold text-ink-200 transition-colors hover:border-brass-400/60'
                  }
                >
                  {count}
                </button>
              ))}
            </div>
            <p className="mb-4 text-xs text-ink-400">Pass-and-play — everyone shares this screen.</p>

            <ol className="space-y-2">
              {players.map((name, index) => (
                <li
                  key={index}
                  className={
                    index === current
                      ? 'flex items-center justify-between rounded-lg bg-felt-700/60 px-3 py-2 ring-1 ring-brass-400/40'
                      : 'flex items-center justify-between rounded-lg px-3 py-2'
                  }
                >
                  <input
                    aria-label={`Name for player ${index + 1}`}
                    value={name}
                    onChange={(event) =>
                      setPlayers((previous) =>
                        previous.map((player, position) => (position === index ? event.target.value : player)),
                      )
                    }
                    className="w-32 bg-transparent text-sm font-medium text-ink-50 focus:outline-none"
                  />
                  <span className="font-bold tabular-nums text-brass-300">{(scores[index] ?? 0).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel>
            <h2 className="mb-3 text-lg font-bold">Quick reference</h2>
            <ul className="space-y-1.5 text-sm text-ink-200">
              <li className="flex justify-between">
                <span>Single 1</span> <Badge tone="gold">100</Badge>
              </li>
              <li className="flex justify-between">
                <span>Single 5</span> <Badge tone="gold">50</Badge>
              </li>
              <li className="flex justify-between">
                <span>Three of a kind</span> <Badge tone="gold">face × 100</Badge>
              </li>
              <li className="flex justify-between">
                <span>Straight / three pairs</span> <Badge tone="gold">1,500</Badge>
              </li>
              <li className="flex justify-between">
                <span>Two triplets</span> <Badge tone="gold">2,500</Badge>
              </li>
            </ul>
            <ButtonLink href="/learn/farkle" variant="ghost" size="sm" className="mt-4">
              Full scoring table →
            </ButtonLink>
          </Panel>
        </div>
      </div>
    </>
  );
}
