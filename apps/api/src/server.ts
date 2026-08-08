import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectToDatabase, disconnectFromDatabase } from './db/connect.js';

async function main(): Promise<void> {
  await connectToDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`[api] listening on http://${env.HOST}:${env.PORT} (${env.NODE_ENV})`);
  });

  // The old app had no shutdown path at all, so a deploy dropped in-flight
  // requests and left Mongo connections behind.
  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(() => {
      void disconnectFromDatabase().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  console.error('[api] failed to start:', error);
  process.exit(1);
});
