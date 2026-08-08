'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Board, Post } from '@/lib/types';
import { formatRelative } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { TextAreaField, TextField } from '@/components/ui/field';
import { Alert, Panel } from '@/components/ui/surface';
import { Modal } from '@/components/ui/modal';

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: '', body: '' });
  const [comment, setComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ post: Post; board: Board }>(`/api/blog/posts/${id}`);
      setPost(data.post);
      setBoard(data.board);
      setDraft({ title: data.post.title, body: data.post.body });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load that post.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const mine = Boolean(user && post && user.id === post.authorId);

  const act = async (work: () => Promise<{ post: Post }>) => {
    setError(null);
    try {
      const data = await work();
      setPost(data.post);
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That did not work. Please try again.');
      return false;
    }
  };

  async function savePost(event: FormEvent) {
    event.preventDefault();
    if (await act(() => api.put<{ post: Post }>(`/api/blog/posts/${id}`, draft))) setEditing(false);
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (await act(() => api.post<{ post: Post }>(`/api/blog/posts/${id}/comments`, { body: comment }))) setComment('');
  }

  async function deletePost() {
    try {
      await api.delete(`/api/blog/posts/${id}`);
      router.push(board ? `/blog/${board.slug}` : '/blog');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not delete the post.');
      setConfirmDelete(false);
    }
  }

  if (loading) return <div className="surface h-96 animate-pulse" aria-busy="true" />;
  if (!post) return <Alert tone="lose">{error ?? 'That post does not exist.'}</Alert>;

  return (
    <>
      <nav className="mb-4">
        <Link
          href={board ? `/blog/${board.slug}` : '/blog'}
          className="text-sm text-ink-400 underline-offset-4 hover:text-brass-300 hover:underline"
        >
          ← Back to {board?.name ?? 'boards'}
        </Link>
      </nav>

      {error && (
        <div className="mb-4">
          <Alert tone="lose">{error}</Alert>
        </div>
      )}

      <Panel>
        {editing ? (
          <form onSubmit={savePost} className="space-y-4" noValidate>
            <TextField
              label="Title"
              value={draft.title}
              onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))}
              maxLength={120}
              required
            />
            <TextAreaField
              label="Post"
              value={draft.body}
              onChange={(event) => setDraft((d) => ({ ...d, body: event.target.value }))}
              maxLength={20000}
              required
            />
            <div className="flex gap-2">
              <Button type="submit">Save changes</Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <article>
            <h1 className="text-2xl font-bold sm:text-3xl">{post.title}</h1>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
              <span>
                by <span className="text-ink-400">{post.authorUsername}</span>
              </span>
              <span>{formatRelative(post.createdAt)}</span>
              {post.editedAt && <span>edited {formatRelative(post.editedAt)}</span>}
            </p>

            {/* Plain text with whitespace preserved — never dangerouslySetInnerHTML. */}
            <div className="mt-6 whitespace-pre-wrap text-ink-200">{post.body}</div>

            {mine && (
              <div className="mt-6 flex gap-2 border-t border-felt-500/20 pt-5">
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </div>
            )}
          </article>
        )}
      </Panel>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold">
          {post.comments?.length ?? 0} {post.comments?.length === 1 ? 'reply' : 'replies'}
        </h2>

        <ul className="space-y-3">
          {post.comments?.map((entry) => {
            const isMine = user?.id === entry.authorId;
            return (
              <li key={entry.id} className="surface p-4">
                <p className="mb-2 flex flex-wrap gap-x-3 text-xs text-ink-600">
                  <span className="font-medium text-ink-400">{entry.authorUsername}</span>
                  <span>{formatRelative(entry.createdAt)}</span>
                  {entry.editedAt && <span>edited</span>}
                </p>

                {editingComment === entry.id ? (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (
                        await act(() =>
                          api.put<{ post: Post }>(`/api/blog/posts/${id}/comments/${entry.id}`, { body: commentDraft }),
                        )
                      ) {
                        setEditingComment(null);
                      }
                    }}
                    className="space-y-3"
                  >
                    <TextAreaField
                      label="Edit reply"
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      maxLength={5000}
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setEditingComment(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm text-ink-200">{entry.body}</p>
                    {isMine && (
                      <div className="mt-3 flex gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingComment(entry.id);
                            setCommentDraft(entry.body);
                          }}
                          className="text-ink-400 underline-offset-4 hover:text-brass-300 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void act(() => api.delete<{ post: Post }>(`/api/blog/posts/${id}/comments/${entry.id}`))}
                          className="text-ink-400 underline-offset-4 hover:text-crimson-400 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <Panel className="mt-5">
          {user ? (
            <form onSubmit={addComment} className="space-y-3" noValidate>
              <TextAreaField
                label="Add a reply"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={5000}
                className="min-h-28"
                required
              />
              <Button type="submit" disabled={comment.trim().length < 2}>
                Post reply
              </Button>
            </form>
          ) : (
            <p className="text-center text-sm text-ink-400">
              <Link href="/login" className="text-brass-300 underline underline-offset-4">
                Sign in
              </Link>{' '}
              to join the discussion.
            </p>
          )}
        </Panel>
      </section>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this post?"
        size="sm"
        footer={
          <>
            <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={() => void deletePost()}>
              Delete
            </Button>
          </>
        }
      >
        <p>The post and all its replies will be removed. This cannot be undone.</p>
      </Modal>
    </>
  );
}
