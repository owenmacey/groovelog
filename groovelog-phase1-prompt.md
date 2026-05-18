# Groovelog — Phase 1 Build Prompt for Claude Code

## Project Overview

Build **Groovelog**, a music rating and social platform (think Letterboxd, but for music). Users can search for songs and albums via the Spotify API, rate them 1–5 stars (half-star precision), write short reviews, follow other users, and see a social activity feed. This is Phase 1: the full working MVP.

---

## Design System — Apply This Everywhere, No Exceptions

### Aesthetic Direction

**Dark, editorial, vinyl-era warmth meets modern precision.** Think a high-end music magazine printed at midnight. The UI should feel like it belongs in a record shop that also sells espresso — cultured, tactile, slightly moody. Not a streaming app. Not a social network. Something with *taste*.

- **Tone:** Refined dark editorial. Controlled density. Every element earns its place.
- **Differentiator:** The warmth. Amber/gold accents against a near-black background feel analog, physical, like holding an album sleeve.
- **Motion:** Purposeful. Staggered page-load reveals, subtle hover lifts, rating stars that fill with a satisfying sweep animation.

### Color Palette (CSS variables — define in `globals.css`)

```css
:root {
  /* Backgrounds */
  --bg-base:        #0D0C0A;   /* near-black, warm tint */
  --bg-surface:     #161512;   /* cards, panels */
  --bg-elevated:    #1E1C18;   /* modals, dropdowns */
  --bg-subtle:      #252320;   /* hover states, input fills */

  /* Borders */
  --border-default: rgba(255, 248, 230, 0.08);
  --border-strong:  rgba(255, 248, 230, 0.16);
  --border-accent:  rgba(214, 160, 64, 0.4);

  /* Text */
  --text-primary:   #F5EFE0;   /* warm off-white, never pure white */
  --text-secondary: #9E9680;   /* muted warm gray */
  --text-tertiary:  #5C5847;   /* placeholders, disabled */
  --text-inverse:   #0D0C0A;

  /* Brand / Accent */
  --accent-gold:    #D6A040;   /* primary CTA, stars, highlights */
  --accent-gold-dim:#9A7130;   /* unfilled stars, secondary accents */
  --accent-amber:   #E8853A;   /* notifications, active states */
  --accent-sage:    #6B8F71;   /* success, following confirmed */

  /* Semantic */
  --error:          #C0442A;
  --warning:        #D6A040;
  --success:        #6B8F71;

  /* Typography scale */
  --font-display:   'Playfair Display', Georgia, serif;   /* headings, album titles */
  --font-body:      'DM Sans', system-ui, sans-serif;     /* body, UI labels */
  --font-mono:      'DM Mono', monospace;                 /* ratings, counts */

  /* Spacing */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  20px;

  /* Shadows */
  --shadow-card:  0 1px 3px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4);
  --shadow-lift:  0 8px 32px rgba(0,0,0,0.7);
}
```

### Typography Rules
- **Display (Playfair Display):** Album titles on detail pages, hero headings, the Groovelog wordmark
- **Body (DM Sans):** All UI labels, navigation, review text, form inputs
- **Mono (DM Mono):** Rating numbers, play counts, listener statistics
- Import both from Google Fonts in `layout.tsx`
- Base size: 15px body, 13px secondary labels
- Line height: 1.6 for body, 1.2 for headings

### Component Patterns
- Cards: `bg-surface`, 1px `border-default` border, `radius-lg`, `shadow-card`; on hover transition to `bg-elevated` + `shadow-lift` over 200ms
- Buttons (primary): `bg: var(--accent-gold)`, `color: var(--text-inverse)`, `radius-md`, bold 14px DM Sans, no border
- Buttons (secondary): transparent bg, `border-strong`, `text-primary`
- Inputs: `bg-subtle` fill, `border-default` border, focus ring `border-accent`, `radius-md`
- Star ratings: custom half-star component; unfilled = `accent-gold-dim`, filled = `accent-gold`, sweep-fill animation on hover/select

---

## Monorepo Structure

```
groovelog/
├── apps/
│   └── web/                    # Next.js 14 App Router
│       ├── app/
│       │   ├── layout.tsx       # Root layout, font imports, providers
│       │   ├── globals.css      # CSS variables above + resets
│       │   ├── page.tsx         # Landing / home feed (redirect if authed)
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── register/page.tsx
│       │   ├── (app)/           # Route group: requires auth
│       │   │   ├── feed/page.tsx
│       │   │   ├── search/page.tsx
│       │   │   ├── album/[id]/page.tsx
│       │   │   ├── track/[id]/page.tsx
│       │   │   ├── user/[username]/page.tsx
│       │   │   └── settings/page.tsx
│       │   └── api/
│       │       └── trpc/[trpc]/route.ts
│       └── components/
│           ├── ui/              # Primitive components (Button, Input, etc.)
│           ├── rating/          # StarRating, HalfStarRating
│           ├── catalog/         # AlbumCard, TrackRow, ArtistChip
│           ├── social/          # ReviewCard, UserAvatar, FollowButton
│           ├── feed/            # ActivityItem, FeedList
│           ├── search/          # SearchBar, SearchResults
│           └── layout/          # Navbar, Sidebar, PageShell
├── packages/
│   ├── api/                    # tRPC router
│   │   ├── src/
│   │   │   ├── root.ts          # mergeRouters
│   │   │   ├── trpc.ts          # context, middleware
│   │   │   └── routers/
│   │   │       ├── auth.ts
│   │   │       ├── user.ts
│   │   │       ├── catalog.ts   # wraps Spotify API
│   │   │       ├── rating.ts
│   │   │       ├── review.ts
│   │   │       └── feed.ts
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema.ts        # Drizzle schema — all tables
│   │   │   └── index.ts         # db client export
│   │   └── drizzle.config.ts
│   └── validators/
│       └── src/
│           ├── rating.ts        # z.number().min(0.5).max(5).step(0.5)
│           ├── review.ts
│           └── user.ts
├── docker-compose.yml           # postgres + redis
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Tech Stack (exact versions)

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for SEO on album pages, RSC |
| Language | TypeScript 5.x strict | End-to-end type safety |
| API | tRPC v11 | Type-safe client↔server, no codegen |
| ORM | Drizzle ORM | Type-safe, migration-first |
| Database | PostgreSQL 16 | Primary relational store |
| Cache | Redis 7 | Session store, rate limiting |
| Auth | Better Auth | Sessions + Spotify OAuth |
| Styling | Tailwind CSS v3 + CSS variables | Utility classes + design tokens |
| State | TanStack Query v5 | Server state, optimistic updates |
| Forms | React Hook Form + Zod | Validated, typed forms |
| Queue | BullMQ | Background jobs (feed fan-out) |
| External API | Spotify Web API | Catalog search + metadata |
| Metadata | MusicBrainz API | Supplemental artist/release data |

---

## Database Schema (`packages/db/src/schema.ts`)

Define all tables using Drizzle ORM with `pgTable`. Use `createId()` from `@paralleldrive/cuid2` for all primary keys.

```typescript
// Users
users: id, username (unique), email (unique), displayName, avatarUrl,
       bio (text, nullable), spotifyId (nullable, unique),
       createdAt, updatedAt

// Follows (self-referential)
follows: followerId → users.id, followingId → users.id
         createdAt
         PRIMARY KEY (followerId, followingId)

// Catalog cache (mirror from Spotify, don't re-fetch constantly)
artists: id, spotifyId (unique), mbid (nullable, unique), name,
         imageUrl, genres (text[]), popularity, createdAt, updatedAt

albums:  id, spotifyId (unique), mbid (nullable), title, artistId → artists.id,
         releaseDate, coverUrl, totalTracks, albumType (enum: album|single|ep),
         createdAt, updatedAt

tracks:  id, spotifyId (unique), mbid (nullable), title, albumId → albums.id,
         artistId → artists.id, durationMs, trackNumber, discNumber,
         previewUrl (nullable), createdAt, updatedAt

// Ratings (half-star: stored as integer 1–10, displayed /2)
ratings: id, userId → users.id, targetType (enum: track|album),
         targetId (text), rating (smallint, 1–10), createdAt, updatedAt
         UNIQUE (userId, targetType, targetId)

// Reviews
reviews: id, userId → users.id, targetType (enum: track|album),
         targetId (text), body (text, max 2000 chars),
         ratingId → ratings.id (nullable), containsSpoilers (bool),
         createdAt, updatedAt

// Review likes
reviewLikes: userId → users.id, reviewId → reviews.id, createdAt
             PRIMARY KEY (userId, reviewId)

// Activity feed events
feedEvents: id, actorId → users.id,
            type (enum: rated|reviewed|followed|listed),
            payload (jsonb),  // { targetType, targetId, rating, reviewId... }
            createdAt
```

Add indexes on: `ratings(userId, targetType, targetId)`, `feedEvents(actorId, createdAt DESC)`, `reviews(targetType, targetId)`, `follows(followingId)`.

---

## tRPC Routers

### `routers/catalog.ts`
- `search(query: string, type: 'album'|'track'|'artist')` — calls Spotify Search API, caches results in Redis for 1 hour, upserts into local catalog tables
- `getAlbum(spotifyId: string)` — fetch album + tracks from Spotify, upsert, return enriched with local rating stats
- `getTrack(spotifyId: string)` — fetch track, upsert, return with local rating stats
- `getTrending()` — return most-rated albums/tracks in last 7 days (from ratings table)

### `routers/rating.ts`
- `upsert({ targetType, targetId, rating })` — create or update rating; emit `rated` feed event via BullMQ; invalidate album aggregate cache
- `delete({ targetType, targetId })` — remove rating
- `getUserRating({ targetType, targetId })` — get current user's rating for a target
- `getAggregates({ targetType, targetId })` — { avgRating, count, distribution: [1..10] }

### `routers/review.ts`
- `create({ targetType, targetId, body, ratingId? })` — create review, emit `reviewed` event
- `update({ id, body })` — update own review only
- `delete({ id })` — delete own review only
- `list({ targetType, targetId, cursor })` — paginated reviews with author + rating joined
- `like({ reviewId })` — toggle like
- `getUserReview({ targetType, targetId })` — get current user's review

### `routers/user.ts`
- `getProfile({ username })` — public profile with stats (ratings count, reviews count, followers, following)
- `follow({ userId })` — follow/unfollow toggle, emit `followed` event
- `getFollowers({ userId, cursor })` — paginated
- `getFollowing({ userId, cursor })` — paginated
- `updateProfile({ displayName, bio, avatarUrl })` — update own profile
- `getRecentActivity({ userId, cursor })` — recent ratings + reviews by user

### `routers/feed.ts`
- `getFollowingFeed({ cursor })` — activity from followed users, ordered by `createdAt DESC`, paginated with cursor
- `getGlobalFeed({ cursor })` — all public activity (for logged-out or new users)

### `routers/auth.ts`
- `register({ email, username, password })` — create user, hash password with argon2
- `login({ email, password })` — verify, create session
- `loginWithSpotify()` — OAuth flow via Better Auth
- `logout()` — destroy session
- `me()` — return current authed user or null

---

## Pages — Implementation Details

### `/` — Landing Page (unauthenticated)
- Hero: Groovelog wordmark in Playfair Display, tagline "Your music, rated. Your taste, shared."
- Animated background: subtle CSS noise texture over `--bg-base`, a slow radial pulse of `--accent-gold` at 5% opacity
- Show 3 sample review cards (static/mocked) to demonstrate the product
- CTA: "Start Rating" (register) + "Log in"
- No Navbar — standalone hero layout

### `/feed` — Activity Feed (authenticated home)
- Left sidebar (240px): nav links (Feed, Search, Profile, Settings), current user avatar + username
- Main column: infinite-scroll feed using TanStack Query `useInfiniteQuery` + Intersection Observer
- Each feed item: `ActivityItem` component showing avatar, action text ("rated Blonde 4.5 ★"), album art thumbnail, timestamp
- Toggle: "Following" / "Global" tabs at top
- Empty state for new users: "Follow some users or rate some albums to get started"

### `/search` — Search
- Prominent search bar at top, autofocus on mount
- Tabs: Albums / Tracks / Artists
- Results grid: `AlbumCard` (3-column grid on desktop) or `TrackRow` (list) depending on tab
- Debounced input (300ms) triggers `catalog.search` tRPC query
- Each result shows: cover art, title, artist, year, and current user's rating badge if they've rated it
- Skeleton loading states while fetching

### `/album/[id]` — Album Detail
- Hero section: large cover art (left, 280px), title in Playfair Display 36px, artist name, year, album type badge
- Aggregate rating: large number in DM Mono, star display, "N ratings" count
- Rating distribution: 10-bar histogram (1–10 half-stars), styled in `--accent-gold`
- Track listing: numbered rows with track title, duration, and per-track rating badge
- "Rate this album" widget: `HalfStarRating` component, prominent, above the fold
- Review section below: list of reviews, most-liked first, with "Write a review" CTA
- Current user's rating/review pinned at top if they've rated

### `/track/[id]` — Track Detail
- Simpler layout: album art (from parent album), track title, artist, album link
- Rating widget + aggregate stats
- Preview player if `previewUrl` is available (HTML5 audio, styled to match design)
- Reviews section

### `/user/[username]` — Profile Page
- Header: avatar, display name, username, bio, follower/following counts, "Follow" button
- Stats row: total ratings, total reviews, avg rating given (in DM Mono)
- Recent ratings grid: album art cards with star overlay
- Recent reviews list
- If viewing own profile: "Edit Profile" button

### `/login` and `/register`
- Centered card layout on `--bg-base`
- Groovelog wordmark at top
- Form with email/password (register adds username field)
- "Continue with Spotify" OAuth button (green Spotify brand color)
- Minimal, focused — no distractions

---

## Key Components

### `HalfStarRating`
```typescript
// Props: value (0 | 0.5 | 1 | ... | 5), onChange?, readonly?
// Render 5 star slots. Each slot is split into left half + right half hit areas.
// Half-hover fills half the star. Full-hover fills the star.
// On select: optimistic update → tRPC upsert → TanStack Query invalidate
// Animation: CSS clip-path sweep from left on fill, 150ms ease-out
```

### `AlbumCard`
```typescript
// Props: album { spotifyId, title, artist, coverUrl, releaseYear }
//         userRating?: number
// Square card, cover art fills top 75%, info below
// userRating badge: bottom-left corner, semi-transparent dark pill with gold star + number
// Hover: cover scales 1.02, shadow-lift, subtle overlay with "Rate" CTA appears
```

### `ReviewCard`
```typescript
// Props: review { body, rating, user { username, avatarUrl }, createdAt, likeCount, isLiked }
// Card layout: avatar + username top-left, star rating top-right
// Review body text (clamp to 4 lines with "Read more" expand)
// Footer: like button (heart icon + count), timestamp
// Like: optimistic toggle with TanStack Query mutation
```

### `ActivityItem`
```typescript
// Props: event { type, actor, payload, createdAt }
// "rated" type: "{actor} rated {albumTitle} · {rating}★" with album thumbnail
// "reviewed" type: same + review snippet
// "followed" type: "{actor} followed {targetUser}"
// Timestamp: relative ("2h ago") using date-fns
```

---

## Auth Middleware

Create `middleware.ts` at root:
- Protect all routes under `/(app)/` — redirect to `/login` if no valid session
- Redirect authenticated users away from `/login` and `/register` to `/feed`
- Use Better Auth's `getSession()` helper

---

## Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://groovelog:groovelog@localhost:5432/groovelog
REDIS_URL=redis://localhost:6379

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify

BETTER_AUTH_SECRET=   # 32+ char random string
BETTER_AUTH_URL=http://localhost:3000

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Docker Compose (local dev)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: groovelog
      POSTGRES_PASSWORD: groovelog
      POSTGRES_DB: groovelog
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

---

## Quality Standards — Enforce Throughout

1. **TypeScript strict mode** — `tsconfig.json` must have `"strict": true`. No `any`. No `// @ts-ignore`.

2. **Zod at every boundary** — All tRPC inputs validated with Zod. Spotify API responses parsed through Zod schemas before use. Env vars validated at startup with `z.object({...}).parse(process.env)`.

3. **Optimistic updates** — Rating and like mutations must update UI immediately via TanStack Query `onMutate` / `onError` rollback pattern. Never wait for server round-trip for perceived-instant interactions.

4. **Error boundaries** — Wrap each page section in an error boundary. API errors surface as toast notifications (use `sonner`), not page crashes.

5. **Loading states** — Every async data fetch has a skeleton loader that matches the shape of the content it's loading. No spinners in the middle of the page.

6. **Accessibility** — All interactive elements have `aria-label`. Star rating keyboard-navigable (arrow keys). Color contrast meets WCAG AA against `--bg-base`.

7. **No `useEffect` for data fetching** — All server data goes through tRPC + TanStack Query. `useEffect` only for DOM side-effects (focus, scroll, event listeners).

8. **Database migrations are committed** — Every schema change produces a Drizzle migration file. Never mutate the DB directly.

9. **Rate limiting** — Spotify API calls rate-limited and cached. User-facing mutations (rating, review) rate-limited per user via Redis.

10. **Image optimization** — All album art through Next.js `<Image>` with `sizes` prop set. Add `images.domains` to `next.config.js` for Spotify CDN (`i.scdn.co`).

---

## Spotify API Integration Notes

- Use the **Client Credentials flow** for catalog search (no user login required)
- Use **Authorization Code flow** for Spotify OAuth login (to get user's Spotify ID)
- Cache access tokens in Redis with TTL matching the Spotify expiry (3600s)
- On search: call `/v1/search?q={query}&type=album,track,artist&limit=20`, upsert results into local catalog tables
- On album detail: call `/v1/albums/{id}` for full track listing
- Store `spotifyId` on every catalog entity — it's your foreign key to Spotify's world
- Abstract all Spotify calls behind a `SpotifyClient` class in `packages/api/src/lib/spotify.ts`

---

## Getting Started Script

At the end of setup, the following commands should work:

```bash
pnpm install
docker-compose up -d
pnpm db:push          # applies Drizzle schema to local postgres
pnpm db:seed          # seeds 10 sample albums + 2 test users
pnpm dev              # starts all apps via Turborepo
```

App runs at `http://localhost:3000`. Test credentials: `test@groovelog.com` / `password123`.

---

## Deliverable Checklist

Before considering Phase 1 complete, verify:

- [ ] Auth: register, login, logout, Spotify OAuth all work
- [ ] Search returns albums and tracks from Spotify, displayed correctly
- [ ] Album detail page shows cover, tracks, aggregate rating
- [ ] Half-star rating widget works with optimistic update
- [ ] Review creation and display works on album + track pages
- [ ] Follow/unfollow works on user profiles
- [ ] Feed shows activity from followed users, paginated
- [ ] Global feed shows all activity
- [ ] All pages have correct loading skeletons
- [ ] Mobile responsive (breakpoints at 768px and 1024px)
- [ ] TypeScript builds with zero errors (`pnpm typecheck`)
- [ ] No ESLint errors (`pnpm lint`)
