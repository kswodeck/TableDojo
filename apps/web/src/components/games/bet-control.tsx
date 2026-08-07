'use client';

import { CoinCount } from './pieces';
import { cx } from '@/lib/format';

/**
 * Bet selector.
 *
 * The original cycled the wager through a single button that incremented and
 * wrapped around, so reaching a specific bet meant clicking repeatedly and
 * there was no way to see the options. These are radio buttons: every choice
 * is visible, reachable by keyboard, and disabled when unaffordable.
 */
export function BetControl({
  value,
  onChange,
  options,
  coins,
  disabled,
  label = 'Bet',
}: {
  value: number;
  onChange: (bet: number) => void;
  options: number[];
  coins: number;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <fieldset disabled={disabled} className="flex flex-wrap items-center gap-3">
      <legend className="sr-only">{label}</legend>
      <span className="text-sm font-semibold tracking-[0.16em] text-ink-400 uppercase">{label}</span>

      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const unaffordable = option > coins;
          return (
            <label
              key={option}
              className={cx(
                'cursor-pointer rounded-lg border px-4 py-2 text-sm font-bold tabular-nums transition-all',
                value === option
                  ? 'border-brass-400 bg-brass-500 text-felt-950'
                  : 'border-felt-500/40 bg-felt-800/60 text-ink-200 hover:border-brass-400/60',
                (unaffordable || disabled) && 'cursor-not-allowed opacity-40 hover:border-felt-500/40',
              )}
            >
              <input
                type="radio"
                name={label}
                value={option}
                checked={value === option}
                disabled={unaffordable || disabled}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {option}
            </label>
          );
        })}
      </div>

      <span className="ml-auto flex items-center gap-1.5 text-sm text-ink-400">
        Balance <CoinCount coins={coins} />
      </span>
    </fieldset>
  );
}
