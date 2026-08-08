# Table Dojo

Learn and practise casino **table games** — blackjack, video poker and farkle. Free practice modes with
strategy guidance, and ranked modes where coins are on the line and the leaderboard is real.

Play money only. No deposits, no cash prizes, no slot machines.

> Formerly *Casino Competitor*. See [Rewrite notes](#rewrite-notes) for what changed and why.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web | Next.js 16 (App Router), React 19, Tailwind CSS 4 | Server components for content pages, client components for the tables |
| API | Express 5, TypeScript | Standalone REST service — auth, accounts, blog, and server-authoritative games |
| Data | MongoDB via Mongoose 8 | Schemas map directly from the original app; indexed for the leaderboard |
| Rules | `@tabledojo/game-logic` | Pure, dependency-free TypeScript shared by both apps |
| Tests | Vitest | 137 tests, mostly over the rules engine |

### Why the rules live in their own package

Practice mode runs the rules **in the browser** — instant, free, no round trip. Ranked mode runs the
*same code* **on the server**, which owns the shoe, the dice and the coin balance. One implementation,
two trust levels. That is the whole reason for the package boundary.

---

## Layout

```
packages/game-logic/   Rules engine: poker, blackjack (+ basic strategy), farkle, dice, coin
apps/api/              Express REST API
apps/web/              Next.js frontend
```

## Getting started

Requires Node 20.11+ and a MongoDB instance (local or Atlas).

```bash
npm install
cp .env.example .env          # then fill in MONGODB_URI and SESSION_SECRET

# generate a session secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

npm run build --workspace @tabledojo/game-logic   # the apps import its build output
npm run dev:api                                   # http://localhost:5000
npm run dev:web                                   # http://localhost:3000
```

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev:api` / `npm run dev:web` | Start one app in watch mode |
| `npm run build` | Build all three workspaces in dependency order |
| `npm test` | Run every test suite |
| `npm run typecheck` | Type-check all workspaces |
| `npm run lint` / `npm run format` | ESLint 9 flat config / Prettier |

> The root [`.npmrc`](.npmrc) sets `include=dev` so builds work on hosts that export
> `NODE_ENV=production` — npm otherwise skips devDependencies, and `typescript` lives there.

## Deployment

Runs at **$0/month**: Vercel Hobby (web) + Render free instance (API) + MongoDB Atlas free cluster.
Full walkthrough in [DEPLOYMENT.md](DEPLOYMENT.md), blueprint in [`render.yaml`](render.yaml).

The free API instance suspends after 15 minutes idle. The app is built for that: the home page, the
three `/learn` guides and all three `/practice` tables run entirely in the browser and stay fully
usable while the API boots, SSR pages fail soft instead of erroring, and the UI says what is
happening rather than hanging. Only sign-in, ranked play, the leaderboard and the blog wait on it.

## Configuration

Everything is validated with Zod at boot, so a misconfigured deploy fails immediately and says which
key is wrong. `MONGODB_URI` and `SESSION_SECRET` are required; the rest have sensible defaults. See
[`.env.example`](.env.example).

With `SMTP_URL` unset, password-reset and contact messages are logged instead of sent, so both flows
are testable locally without a mail provider.

## API

All responses are JSON. Errors share one shape: `{ "error": { "code", "message", "details"? } }`.

| Route | Purpose |
| --- | --- |
| `POST /api/auth/register` · `/login` · `/logout` · `GET /me` | Session auth |
| `POST /api/auth/forgot-username` · `/forgot-password` · `/reset-password` | Recovery via emailed single-use tokens |
| `GET`/`PUT`/`DELETE /api/account`, `PUT /api/account/password` | Profile management |
| `GET /api/leaderboard?page&search` | Paged, index-backed rankings |
| `GET`/`POST`/`PUT`/`DELETE /api/blog/...` | Boards, posts, comments |
| `POST /api/games/poker/deal` · `/draw` | Ranked video poker |
| `POST /api/games/blackjack/start` · `/action` | Ranked blackjack |
| `POST /api/games/farkle/start` · `/roll` · `/keep` · `/bank` | Ranked farkle |

---

## Rewrite notes

The original was an Express 4 + EJS app on Node 14, with game logic written as imperative DOM
manipulation over module-level globals. The behaviour was worth keeping; almost none of the code was.

### Security

- **Games are server-authoritative.** The browser used to compute its own winnings and `PUT` a new
  coin balance back, which the server wrote as given — anyone could set their balance from the
  console. The server now deals, rolls, scores and moves coins; the client only sends decisions.
- **Password reset actually verifies ownership.** The old flow set a flag and redirected to
  `/forgotpass?userId=<real id>`; anyone with that URL could set a new password. Now: a 32-byte
  single-use token, stored only as a SHA-256 digest, expiring after an hour, mailed to the address on
  file.
- **Account enumeration closed.** "Forgot username" returned the username in the response body when
  given an email, phone and birthday. It now emails the address on file and always answers
  identically.
- **`app.use('/javascripts', express.static('node_modules'))` is gone** — that served the entire
  dependency tree to the public.
- Hard-coded session secret and Sentry DSN moved to validated environment config.
- Passwords upgraded from PBKDF2 to scrypt, **with transparent migration**: legacy
  `passport-local-mongoose` hashes still verify and are re-hashed on the next successful sign-in, so
  existing accounts keep working without a forced reset.
- Added Helmet, CORS allow-listing, body size limits, rate limiting on credential and contact routes,
  and session-ID rotation on login.
- Post bodies are plain text. The blog stored raw Quill HTML and re-injected it with `innerHTML`,
  making every post a stored-XSS vector.
- Post and comment edit/delete check ownership on the server. Previously only the template hid the
  buttons, so a hand-rolled request could rewrite anyone's post.

### Correctness

- **Login streaks** compared date strings built by slicing `Date.prototype.toString()` at fixed
  offsets, and shipped with a `// this situation may be off` comment. Now whole UTC days, unit-tested
  across month and year boundaries.
- **Account updates** fired several un-awaited `findOneAndUpdate` calls and used
  `res.setTimeout(400, …)` to guess when they had finished — a slow write was simply lost. Now one
  validated write.
- **Comments were addressed by array index**, so deleting one shifted every later index and the next
  edit hit the wrong comment. They have their own IDs now, and are embedded in the post so deleting a
  post cannot orphan them.
- **The leaderboard** loaded every user into memory, sorted them, then walked two arrays in a nested
  loop to rank search results. It is now an indexed, paged query. Search input is also escaped before
  reaching a `RegExp`.
- **The profanity filter** ran only in the browser, shipped 200 literal strings on every page load,
  and matched bare substrings — so "class", "assist" and "Scunthorpe" were all rejected. It now runs
  server-side and separates substring-safe terms from word-boundary-only ones.
- **The contact form never sent anything.** The route waited 500ms and re-rendered with a success
  banner.

### Frontend

- EJS templates and 1,381 lines of hand-written CSS replaced with React components and a Tailwind
  token system.
- Native `<dialog>` for modals — focus trapping, Escape-to-close and backdrop for free — replacing the
  hand-rolled implementation and its polyfill.
- Nav dropdowns are keyboard-reachable and close on Escape and outside click; they were `:hover`-only.
- Form errors are tied to inputs with `aria-describedby`/`aria-invalid` instead of being rendered into
  a detached `<ul>`.
- Added a skip link, visible focus styles, and `prefers-reduced-motion` support.
- Bet selection is a radio group. It used to be one button that incremented and wrapped around.
- Dates go through `Intl` rather than string slicing and a chain of ternaries.

### Product

Reframed from a virtual casino to a **training** site for casino table games:

- **Blackjack added**, with a basic-strategy engine that grades every practice decision and explains
  the reasoning. It is the ideal tutorial game because correct play is a solved problem.
- Modes split into **`/practice`** (free, hints available), **`/compete`** (ranked, coins) and
  **`/learn`** (rules and strategy). The basic-strategy chart is *generated from the engine*, so the
  documentation cannot drift from the game.
- Slots dropped from the blog boards, in line with the table-games-only scope.

### Known gaps

- Farkle's house scoring table is preserved exactly as the original computed it, including three 1s
  scoring 300 (as three individual 1s) rather than the more common 1,000. Change
  `SCORE_UNITS`/`tripletUnits` in `packages/game-logic/src/farkle.ts` if you want standard scoring.
- API tests cover the pure, security-critical units (password hashing and legacy verification, login
  bonus, profanity). Route-level integration tests need a MongoDB instance and are not written yet.
- Tutorial mode exists as scaffolding: the strategy engine, grading and `/learn` routes are in place;
  guided step-by-step lessons are not built.
- On the free hosting tier the first sign-in after an idle spell waits on a cold start of up to a
  minute. Moving the API to Render's $7/month Starter plan removes it with no code change.
