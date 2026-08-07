import { Router } from 'express';
import { z } from 'zod';
import { validate, validatedQuery } from '../middleware/validate.js';
import { User } from '../models/user.js';

export const leaderboardRouter = Router();

const PAGE_SIZE = 25;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().trim().max(25).default(''),
});

/** Escapes user input before it reaches a RegExp, which the old route did not. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Ranked leaderboard.
 *
 * The old route loaded every user in the collection into memory, sorted them,
 * then walked two arrays in a nested loop to work out the rank of each search
 * result — O(n) memory and O(n^2) time on every page view. Ranks now come from
 * a single count query per row set, and paging is index-backed.
 */
leaderboardRouter.get('/', validate(querySchema, 'query'), async (req, res) => {
  const { page, search } = validatedQuery<z.infer<typeof querySchema>>(req);

  const filter = search ? { username: new RegExp(escapeRegex(search), 'i') } : {};
  const skip = (page - 1) * PAGE_SIZE;

  const [rows, total] = await Promise.all([
    User.find(filter)
      .sort({ coins: -1, _id: 1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .select('username coins highestWin profileImage')
      .lean(),
    User.countDocuments(filter),
  ]);

  // A search result's rank is its position on the unfiltered board, which is
  // the number of players ahead of it.
  const ranks = await Promise.all(
    rows.map((row) =>
      User.countDocuments({
        $or: [{ coins: { $gt: row.coins } }, { coins: row.coins, _id: { $lt: row._id } }],
      }),
    ),
  );

  res.json({
    entries: rows.map((row, index) => ({
      rank: (ranks[index] ?? 0) + 1,
      username: row.username,
      coins: row.coins,
      highestWin: row.highestWin,
      profileImage: row.profileImage,
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    search,
  });
});
