/**
 * Date and number formatting.
 *
 * The original built dates by slicing `Date.prototype.toString()` at fixed
 * character offsets and mapping month abbreviations through a chain of ternary
 * operators. `Intl` does all of it, correctly and in the reader's locale.
 */
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const numberFormatter = new Intl.NumberFormat();

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** "3 days ago", falling back to an absolute date beyond a month. */
export function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
  ];

  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  let value = seconds;

  for (const [unit, step] of units) {
    if (Math.abs(value) < step) return relative.format(Math.round(value), unit);
    value /= step;
  }

  return dateFormatter.format(date);
}

/** Joins conditional class names; keeps JSX readable without a dependency. */
export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}
