import { Schema, model, type HydratedDocument, type InferSchemaType, type Model, type Types } from 'mongoose';

/** The fixed set of discussion boards, mirrored by the web app's routing. */
export const BOARDS = [
  { slug: 'blackjack', name: 'Blackjack', description: 'Basic strategy, counting and table talk' },
  { slug: 'poker', name: 'Poker', description: 'Poker tips, strategies & discussion' },
  { slug: 'farkle', name: 'Farkle', description: 'Farkle tips, strategies & discussion' },
  { slug: 'other', name: 'Other Games', description: 'Other casino game tips, strategies & discussion' },
  { slug: 'requests', name: 'Requests', description: 'Board suggestions, feedback & feature requests' },
  { slug: 'random', name: 'Random', description: 'Anything else' },
] as const;

export type BoardSlug = (typeof BOARDS)[number]['slug'];
export const BOARD_SLUGS = BOARDS.map((board) => board.slug) as unknown as BoardSlug[];

export function findBoard(slug: string) {
  return BOARDS.find((board) => board.slug === slug.toLowerCase());
}

const commentSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorUsername: { type: String, required: true },
    body: { type: String, required: true, trim: true, minlength: 2, maxlength: 5000 },
    editedAt: { type: Date },
  },
  { timestamps: true, _id: true },
);

const postSchema = new Schema(
  {
    board: { type: String, required: true, enum: BOARD_SLUGS, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorUsername: { type: String, required: true },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    /**
     * Plain text. The original stored raw Quill HTML and re-injected it with
     * innerHTML, which made every post a stored-XSS vector.
     */
    body: { type: String, required: true, trim: true, minlength: 2, maxlength: 20000 },
    editedAt: { type: Date },
    // Comments are embedded rather than a separate collection with an array of
    // refs. They are always read with their post, are bounded in size, and the
    // old two-collection setup leaked orphaned Comment documents on delete.
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true },
);

postSchema.index({ board: 1, updatedAt: -1 });

export type PostAttrs = InferSchemaType<typeof postSchema>;
export type PostDocument = HydratedDocument<PostAttrs>;
export type CommentAttrs = InferSchemaType<typeof commentSchema>;

export const Post: Model<PostAttrs> = model<PostAttrs>('Post', postSchema);

export interface PublicComment {
  id: string;
  authorId: string;
  authorUsername: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
}

export interface PublicPost {
  id: string;
  board: string;
  authorId: string;
  authorUsername: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  commentCount: number;
  comments?: PublicComment[];
}

function timestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(0).toISOString();
}

export function toPublicPost(post: PostDocument, options: { withComments?: boolean } = {}): PublicPost {
  const base: PublicPost = {
    id: post._id.toString(),
    board: post.board,
    authorId: (post.author as Types.ObjectId).toString(),
    authorUsername: post.authorUsername,
    title: post.title,
    body: post.body,
    createdAt: timestamp(post.get('createdAt')),
    updatedAt: timestamp(post.get('updatedAt')),
    editedAt: post.editedAt ? post.editedAt.toISOString() : null,
    commentCount: post.comments.length,
  };

  if (!options.withComments) return base;

  return {
    ...base,
    comments: post.comments.map((comment) => ({
      id: comment._id.toString(),
      authorId: (comment.author as Types.ObjectId).toString(),
      authorUsername: comment.authorUsername,
      body: comment.body,
      createdAt: timestamp((comment as { createdAt?: Date }).createdAt),
      editedAt: comment.editedAt ? comment.editedAt.toISOString() : null,
    })),
  };
}
