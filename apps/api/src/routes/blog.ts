import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/http-error.js';
import { findProfanity } from '../lib/profanity.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { param, validate, validatedQuery } from '../middleware/validate.js';
import { BOARDS, BOARD_SLUGS, Post, findBoard, toPublicPost } from '../models/post.js';

export const blogRouter = Router();

const PAGE_SIZE = 20;

const bodySchema = z.object({
  title: z.string().trim().min(2, 'Give your post a title').max(120, 'Titles are limited to 120 characters'),
  body: z.string().trim().min(2, 'Write something first').max(20000, 'Posts are limited to 20,000 characters'),
});

const commentSchema = z.object({
  body: z.string().trim().min(2, 'Write something first').max(5000, 'Comments are limited to 5,000 characters'),
});

/** Applies the same profanity screen the client shows, but authoritatively. */
function assertClean(fields: Record<string, string>): void {
  for (const [field, value] of Object.entries(fields)) {
    const word = findProfanity(value);
    if (word) {
      throw HttpError.badRequest('Please keep it civil', [
        { field, message: 'That text contains language we do not allow' },
      ]);
    }
  }
}

blogRouter.get('/boards', (_req, res) => {
  res.json({ boards: BOARDS });
});

blogRouter.get(
  '/boards/:slug',
  validate(z.object({ page: z.coerce.number().int().min(1).default(1) }), 'query'),
  async (req, res) => {
    const board = findBoard(param(req, 'slug'));
    if (!board) throw HttpError.notFound('That discussion board does not exist');

    const { page } = validatedQuery<{ page: number }>(req);

    const [posts, total] = await Promise.all([
      Post.find({ board: board.slug })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Post.countDocuments({ board: board.slug }),
    ]);

    res.json({
      board,
      posts: posts.map((post) => toPublicPost(post)),
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  },
);

blogRouter.get('/posts/:id', async (req, res) => {
  const post = await Post.findById(param(req, 'id'));
  if (!post) throw HttpError.notFound('That post does not exist');

  const board = findBoard(post.board);
  res.json({ post: toPublicPost(post, { withComments: true }), board });
});

blogRouter.post(
  '/boards/:slug/posts',
  requireAuth,
  validate(bodySchema),
  async (req, res) => {
    const board = findBoard(param(req, 'slug'));
    if (!board) throw HttpError.notFound('That discussion board does not exist');

    const user = currentUser(req);
    const { title, body } = req.body as z.infer<typeof bodySchema>;
    assertClean({ title, body });

    const post = await Post.create({
      board: board.slug,
      author: user._id,
      authorUsername: user.username,
      title,
      body,
    });

    res.status(201).json({ post: toPublicPost(post, { withComments: true }) });
  },
);

blogRouter.put('/posts/:id', requireAuth, validate(bodySchema), async (req, res) => {
  const user = currentUser(req);
  const post = await Post.findById(param(req, 'id'));
  if (!post) throw HttpError.notFound('That post does not exist');

  // The old routes checked ownership only in the template that rendered the
  // edit form, so a hand-rolled PUT could rewrite anyone's post.
  if (!post.author.equals(user._id)) throw HttpError.forbidden('You can only edit your own posts');

  const { title, body } = req.body as z.infer<typeof bodySchema>;
  assertClean({ title, body });

  post.title = title;
  post.body = body;
  post.editedAt = new Date();
  await post.save();

  res.json({ post: toPublicPost(post, { withComments: true }), message: 'Your post has been updated' });
});

blogRouter.delete('/posts/:id', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const post = await Post.findById(param(req, 'id'));
  if (!post) throw HttpError.notFound('That post does not exist');
  if (!post.author.equals(user._id)) throw HttpError.forbidden('You can only delete your own posts');

  // Comments are embedded, so they go with the post — no orphans left behind.
  await post.deleteOne();

  res.json({ message: 'Your post has been deleted', board: post.board });
});

blogRouter.post('/posts/:id/comments', requireAuth, validate(commentSchema), async (req, res) => {
  const user = currentUser(req);
  const { body } = req.body as z.infer<typeof commentSchema>;
  assertClean({ body });

  const post = await Post.findById(param(req, 'id'));
  if (!post) throw HttpError.notFound('That post does not exist');

  post.comments.push({ author: user._id, authorUsername: user.username, body });
  await post.save();

  res.status(201).json({ post: toPublicPost(post, { withComments: true }) });
});

blogRouter.put('/posts/:id/comments/:commentId', requireAuth, validate(commentSchema), async (req, res) => {
  const user = currentUser(req);
  const { body } = req.body as z.infer<typeof commentSchema>;
  assertClean({ body });

  const post = await Post.findById(param(req, 'id'));
  if (!post) throw HttpError.notFound('That post does not exist');

  // Comments are addressed by their own id. The old routes used the array
  // index from the URL, so deleting a comment shifted every later index and
  // the next edit hit the wrong one.
  const comment = post.comments.id(param(req, 'commentId'));
  if (!comment) throw HttpError.notFound('That comment does not exist');
  if (!comment.author.equals(user._id)) throw HttpError.forbidden('You can only edit your own comments');

  comment.body = body;
  comment.editedAt = new Date();
  await post.save();

  res.json({ post: toPublicPost(post, { withComments: true }), message: 'Your comment has been updated' });
});

blogRouter.delete('/posts/:id/comments/:commentId', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const post = await Post.findById(param(req, 'id'));
  if (!post) throw HttpError.notFound('That post does not exist');

  const comment = post.comments.id(param(req, 'commentId'));
  if (!comment) throw HttpError.notFound('That comment does not exist');
  if (!comment.author.equals(user._id)) throw HttpError.forbidden('You can only delete your own comments');

  comment.deleteOne();
  await post.save();

  res.json({ post: toPublicPost(post, { withComments: true }), message: 'Your comment has been deleted' });
});

export { BOARD_SLUGS };
