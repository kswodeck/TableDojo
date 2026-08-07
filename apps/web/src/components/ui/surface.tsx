import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('surface shadow-table p-6', className)}>{children}</div>;
}

export function PageHeading({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-sm font-semibold tracking-[0.18em] text-brass-400 uppercase">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-200">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

type Tone = 'neutral' | 'win' | 'lose' | 'gold';

const TONES: Record<Tone, string> = {
  neutral: 'bg-felt-700/60 text-ink-200 border-felt-500/40',
  win: 'bg-felt-500/25 text-emerald-200 border-emerald-400/40',
  lose: 'bg-crimson-600/20 text-crimson-400 border-crimson-500/40',
  gold: 'bg-brass-500/15 text-brass-300 border-brass-400/40',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Alert({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role="alert" className={cx('rounded-lg border px-4 py-3 text-sm', TONES[tone])}>
      {children}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="text-lg font-semibold text-ink-50">{title}</h3>
      {description && <p className="max-w-md text-sm text-ink-400">{description}</p>}
      {action}
    </div>
  );
}
