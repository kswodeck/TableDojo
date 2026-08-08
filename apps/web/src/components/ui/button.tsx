import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brass-500 text-felt-950 hover:bg-brass-400 active:translate-y-px shadow-[0_4px_0_0_var(--color-brass-600)] active:shadow-[0_2px_0_0_var(--color-brass-600)]',
  secondary:
    'bg-felt-700 text-ink-50 border border-felt-500/40 hover:bg-felt-600 active:translate-y-px',
  ghost: 'text-ink-200 hover:text-brass-300 hover:bg-felt-800/60',
  danger:
    'bg-crimson-500 text-white hover:bg-crimson-400 active:translate-y-px shadow-[0_4px_0_0_var(--color-crimson-600)] active:shadow-[0_2px_0_0_var(--color-crimson-600)]',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:active:translate-y-0';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function buttonClass({ variant = 'primary', size = 'md', className }: StyleProps = {}): string {
  return cx(BASE, VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant,
  size,
  className,
  children,
  ...props
}: ComponentProps<'button'> & StyleProps & { children: ReactNode }) {
  return (
    <button className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & StyleProps & { children: ReactNode }) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
