'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-ink-400">
        The page hit an error. Trying again often clears it — if it does not, let us know what you were doing.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/contact" variant="secondary">
          Report it
        </ButtonLink>
      </div>
      {error.digest && <p className="mt-6 font-mono text-xs text-ink-600">Reference: {error.digest}</p>}
    </div>
  );
}
