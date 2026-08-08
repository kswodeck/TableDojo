import express, { type Express } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, isProduction, isTest } from './config/env.js';
import { configurePassport } from './auth/passport.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { accountRouter } from './routes/account.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { blogRouter } from './routes/blog.js';
import { contactRouter } from './routes/contact.js';
import { pokerRouter } from './routes/games/poker.js';
import { blackjackRouter } from './routes/games/blackjack.js';
import { farkleRouter } from './routes/games/farkle.js';

export interface AppOptions {
  /** Overrides the session store, so tests can run without a Mongo URL. */
  sessionStore?: session.Store;
  mongoUrl?: string;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();

  // Behind a proxy, secure cookies and rate limiting need the real client IP.
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(compression());
  if (!isTest) app.use(morgan(isProduction ? 'combined' : 'dev'));

  app.use(
    cors({
      // The API and the web app are separate origins, so the session cookie
      // only travels on requests from origins on the allow list.
      origin(origin, callback) {
        if (!origin || env.CORS_ORIGINS.length === 0 || env.CORS_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origin ${origin} is not allowed`));
      },
      credentials: true,
    }),
  );

  // The old app served node_modules at /javascripts and accepted unbounded
  // JSON bodies. Nothing static is served here at all, and bodies are capped.
  app.use(express.json({ limit: '128kb' }));
  app.use(express.urlencoded({ extended: false, limit: '128kb' }));

  app.use(
    session({
      name: env.SESSION_COOKIE_NAME,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store:
        options.sessionStore ??
        MongoStore.create({
          mongoUrl: options.mongoUrl ?? env.MONGODB_URI,
          ttl: env.SESSION_TTL_DAYS * 24 * 60 * 60,
          touchAfter: 24 * 60 * 60,
        }),
      cookie: {
        httpOnly: true,
        sameSite: env.COOKIE_SAMESITE,
        secure: isProduction,
        maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
      },
    }),
  );

  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: () => isTest,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/blog', blogRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/games/poker', pokerRouter);
  app.use('/api/games/blackjack', blackjackRouter);
  app.use('/api/games/farkle', farkleRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
