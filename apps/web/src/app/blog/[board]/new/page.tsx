'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import type { Post } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TextAreaField, TextField } from '@/components/ui/field';
import { Alert, PageHeading, Panel } from '@/components/ui/surface';
import { RequireAuth } from '@/components/require-auth';

function NewPostForm({ board }: { board: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const { post } = await api.post<{ post: Post }>(`/api/blog/boards/${board}/posts`, { title, body });
      router.push(`/blog/post/${post.id}`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fieldErrors);
        setMessage(caught.message);
      } else {
        setMessage('Could not publish your post. Please try again.');
      }
      setBusy(false);
    }
  }

  return (
    <Panel>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {message && <Alert tone="lose">{message}</Alert>}

        <TextField
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={errors.title}
          maxLength={120}
          required
          autoFocus
        />
        <TextAreaField
          label="Post"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          error={errors.body}
          maxLength={20000}
          hint="Plain text — line breaks are preserved."
          required
        />

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? 'Publishing…' : 'Publish post'}
          </Button>
          <Link
            href={`/blog/${board}`}
            className="self-center px-2 text-sm text-ink-400 underline-offset-4 hover:text-brass-300 hover:underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Panel>
  );
}

export default function NewPostPage() {
  const params = useParams<{ board: string }>();
  const board = params.board;

  return (
    <>
      <nav className="mb-4">
        <Link href={`/blog/${board}`} className="text-sm text-ink-400 underline-offset-4 hover:text-brass-300 hover:underline">
          ← Back to board
        </Link>
      </nav>
      <PageHeading eyebrow="Community" title="New post" />
      <RequireAuth>
        <NewPostForm board={board} />
      </RequireAuth>
    </>
  );
}
