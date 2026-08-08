import type { Board } from './types';

/**
 * The discussion boards, mirroring `BOARDS` in `apps/api/src/models/post.ts`.
 *
 * The list is small, fixed, and part of the site's navigation, so the web app
 * keeps its own copy rather than being unable to render a board page when the
 * API is asleep. The API remains the authority — it rejects a post to any slug
 * not in its own list — so a drift here shows up as a 404, never as a bad write.
 */
export const BOARDS: readonly Board[] = [
  { slug: 'blackjack', name: 'Blackjack', description: 'Basic strategy, counting and table talk' },
  { slug: 'poker', name: 'Poker', description: 'Poker tips, strategies & discussion' },
  { slug: 'farkle', name: 'Farkle', description: 'Farkle tips, strategies & discussion' },
  { slug: 'other', name: 'Other Games', description: 'Other casino game tips, strategies & discussion' },
  { slug: 'requests', name: 'Requests', description: 'Board suggestions, feedback & feature requests' },
  { slug: 'random', name: 'Random', description: 'Anything else' },
];
