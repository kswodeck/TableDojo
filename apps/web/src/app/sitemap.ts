import type { MetadataRoute } from 'next';

const BASE = 'https://tabledojo.com';

/**
 * Generated rather than hand-maintained — the old public/sitemap.xml listed
 * routes that no longer existed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', priority: 1 },
    { path: '/practice/blackjack', priority: 0.9 },
    { path: '/practice/poker', priority: 0.9 },
    { path: '/practice/farkle', priority: 0.9 },
    { path: '/learn/blackjack', priority: 0.8 },
    { path: '/learn/poker', priority: 0.8 },
    { path: '/learn/farkle', priority: 0.8 },
    { path: '/compete/blackjack', priority: 0.7 },
    { path: '/compete/poker', priority: 0.7 },
    { path: '/compete/farkle', priority: 0.7 },
    { path: '/leaderboard', priority: 0.6 },
    { path: '/blog', priority: 0.6 },
    { path: '/tools/dice', priority: 0.4 },
    { path: '/tools/coin', priority: 0.4 },
    { path: '/contact', priority: 0.3 },
    { path: '/register', priority: 0.3 },
  ];

  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${BASE}${route.path}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: route.priority,
  }));
}
