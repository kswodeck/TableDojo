import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-display text-6xl font-bold text-brass-500/60">404</p>
      <h1 className="mt-4 text-2xl font-bold">That page is not in the deck</h1>
      <p className="mt-2 text-ink-400">The link may be out of date, or the page may have moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to the lobby</ButtonLink>
        <ButtonLink href="/practice/blackjack" variant="secondary">
          Practice blackjack
        </ButtonLink>
      </div>
    </div>
  );
}
