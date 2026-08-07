import Link from 'next/link';
import type { Metadata } from 'next';
import { api } from '@/lib/api';
import type { Board } from '@/lib/types';
import { EmptyState, PageHeading } from '@/components/ui/surface';

export const metadata: Metadata = {
  title: 'Community',
  description: 'Strategy discussion, questions and feedback from Table Dojo players.',
};

export const dynamic = 'force-dynamic';

export default async function BlogIndexPage() {
  let boards: Board[] = [];
  try {
    boards = (await api.get<{ boards: Board[] }>('/api/blog/boards')).boards;
  } catch {
    boards = [];
  }

  return (
    <>
      <PageHeading
        eyebrow="Community"
        title="Discussion boards"
        description="Compare strategies, ask questions, and tell us what to build next."
      />

      {boards.length === 0 ? (
        <EmptyState title="Boards are unavailable" description="We could not reach the community service. Try again shortly." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {boards.map((board) => (
            <Link
              key={board.slug}
              href={`/blog/${board.slug}`}
              className="surface group p-6 transition-colors hover:border-brass-400/45"
            >
              <h2 className="text-xl font-bold text-ink-50 transition-colors group-hover:text-brass-300">{board.name}</h2>
              <p className="mt-1 text-sm text-ink-400">{board.description}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
