import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError, api } from '@/lib/api';
import type { Board, Post } from '@/lib/types';
import { formatRelative } from '@/lib/format';
import { ButtonLink } from '@/components/ui/button';
import { BOARDS } from '@/lib/boards';
import { EmptyState, PageHeading } from '@/components/ui/surface';

export const dynamic = 'force-dynamic';

interface BoardResponse {
  board: Board;
  posts: Post[];
  page: number;
  totalPages: number;
  total: number;
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ board: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { board: slug } = await params;
  const { page = '1' } = await searchParams;

  let data: BoardResponse;
  try {
    data = await api.get<BoardResponse>(`/api/blog/boards/${slug}?page=${encodeURIComponent(page)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();

    // The API runs on a tier that suspends when idle. Rendering happens inside
    // a serverless function with its own time limit, so waiting out a cold
    // start here would kill the whole page. Show the board shell instead and
    // let the reader retry once the API is up.
    if (error instanceof ApiError && error.isUnreachable) {
      const board = BOARDS.find((entry) => entry.slug === slug.toLowerCase());
      if (!board) notFound();

      return (
        <>
          <nav className="mb-4">
            <Link href="/blog" className="text-sm text-ink-400 underline-offset-4 hover:text-brass-300 hover:underline">
              ← All boards
            </Link>
          </nav>
          <PageHeading eyebrow="Community" title={board.name} description={board.description} />
          <EmptyState
            title="Posts are still loading"
            description="The community service is waking up — this takes up to a minute on the free tier. Refresh shortly."
            action={
              <ButtonLink href={`/blog/${slug}`} className="mt-2">
                Try again
              </ButtonLink>
            }
          />
        </>
      );
    }

    throw error;
  }

  return (
    <>
      <nav className="mb-4">
        <Link href="/blog" className="text-sm text-ink-400 underline-offset-4 hover:text-brass-300 hover:underline">
          ← All boards
        </Link>
      </nav>

      <PageHeading
        eyebrow="Community"
        title={data.board.name}
        description={data.board.description}
        actions={<ButtonLink href={`/blog/${slug}/new`}>New post</ButtonLink>}
      />

      {data.posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Be the first to start a discussion on this board."
          action={<ButtonLink href={`/blog/${slug}/new`} className="mt-2">Write the first post</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {data.posts.map((post) => (
            <li key={post.id}>
              <Link href={`/blog/post/${post.id}`} className="surface group block p-5 transition-colors hover:border-brass-400/45">
                <h2 className="text-lg font-semibold text-ink-50 transition-colors group-hover:text-brass-300">
                  {post.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-ink-400">{post.body}</p>
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
                  <span>
                    by <span className="text-ink-400">{post.authorUsername}</span>
                  </span>
                  <span>{formatRelative(post.createdAt)}</span>
                  <span>
                    {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data.totalPages > 1 && (
        <nav aria-label="Board pages" className="mt-6 flex items-center justify-between">
          {data.page > 1 ? (
            <ButtonLink href={`/blog/${slug}?page=${data.page - 1}`} variant="secondary" size="sm">
              ← Previous
            </ButtonLink>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-400">
            Page {data.page} of {data.totalPages}
          </span>
          {data.page < data.totalPages ? (
            <ButtonLink href={`/blog/${slug}?page=${data.page + 1}`} variant="secondary" size="sm">
              Next →
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
