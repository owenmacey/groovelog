import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  smallint,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const albumTypeEnum = pgEnum("album_type", ["album", "single", "ep"]);
export const targetTypeEnum = pgEnum("target_type", ["track", "album"]);
export const feedEventTypeEnum = pgEnum("feed_event_type", [
  "rated",
  "reviewed",
  "followed",
  "listed",
]);

// ─── Feed payload types ───────────────────────────────────────────────────────

export type RatedPayload = {
  targetType: "track" | "album";
  targetId: string;
  spotifyId?: string;
  rating: number;
  title: string;
  coverUrl: string | null;
  isRerate?: boolean;
};

export type ReviewedPayload = {
  targetType: "track" | "album";
  targetId: string;
  spotifyId?: string;
  reviewId: string;
  rating: number | null;
  title: string;
  coverUrl: string | null;
};

export type FollowedPayload = {
  targetUserId: string;
  targetUsername: string;
  targetDisplayName: string;
};

export type ListedPayload = {
  listId: string;
  targetType: "track" | "album";
  targetId: string;
};

export type FeedEventPayload =
  | RatedPayload
  | ReviewedPayload
  | FollowedPayload
  | ListedPayload;

// ─── Users ────────────────────────────────────────────────────────────────────
// Extends Better Auth's required user fields with our custom ones.

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  // Better Auth required
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  // Groovelog custom
  username: varchar("username", { length: 30 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  spotifyId: varchar("spotify_id", { length: 100 }).unique(),
});

// ─── Better Auth tables ───────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    mode: "date",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }),
  updatedAt: timestamp("updated_at", { mode: "date" }),
});

// ─── Follows ──────────────────────────────────────────────────────────────────

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_id_idx").on(t.followingId),
  ]
);

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const artists = pgTable("artists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  spotifyId: varchar("spotify_id", { length: 100 }).notNull().unique(),
  mbid: varchar("mbid", { length: 100 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  genres: text("genres").array().default([]).notNull(),
  popularity: integer("popularity").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const albums = pgTable("albums", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  spotifyId: varchar("spotify_id", { length: 100 }).notNull().unique(),
  mbid: varchar("mbid", { length: 100 }),
  title: varchar("title", { length: 500 }).notNull(),
  artistId: text("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  releaseDate: varchar("release_date", { length: 20 }),
  coverUrl: text("cover_url"),
  totalTracks: integer("total_tracks").default(0).notNull(),
  albumType: albumTypeEnum("album_type").default("album").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const tracks = pgTable("tracks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  spotifyId: varchar("spotify_id", { length: 100 }).notNull().unique(),
  mbid: varchar("mbid", { length: 100 }),
  title: varchar("title", { length: 500 }).notNull(),
  albumId: text("album_id")
    .notNull()
    .references(() => albums.id, { onDelete: "cascade" }),
  artistId: text("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  durationMs: integer("duration_ms").default(0).notNull(),
  trackNumber: integer("track_number").default(1).notNull(),
  discNumber: integer("disc_number").default(1).notNull(),
  previewUrl: text("preview_url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Ratings ──────────────────────────────────────────────────────────────────

export const ratings = pgTable(
  "ratings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: targetTypeEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    // Stored 1–10; displayed as 0.5–5.0 (divide by 2)
    rating: smallint("rating").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("ratings_user_target_uniq").on(
      t.userId,
      t.targetType,
      t.targetId
    ),
    index("ratings_user_target_idx").on(t.userId, t.targetType, t.targetId),
    index("ratings_target_idx").on(t.targetType, t.targetId),
  ]
);

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviews = pgTable(
  "reviews",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: targetTypeEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    body: text("body").notNull(),
    ratingId: text("rating_id").references(() => ratings.id, {
      onDelete: "set null",
    }),
    containsSpoilers: boolean("contains_spoilers").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("reviews_target_idx").on(t.targetType, t.targetId)]
);

// ─── Review Likes ─────────────────────────────────────────────────────────────

export const reviewLikes = pgTable(
  "review_likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.reviewId] })]
);

// ─── Feed Events ──────────────────────────────────────────────────────────────

export const feedEvents = pgTable(
  "feed_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: feedEventTypeEnum("type").notNull(),
    payload: jsonb("payload").$type<FeedEventPayload>().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("feed_events_actor_created_idx").on(t.actorId, t.createdAt),
    index("feed_events_created_idx").on(t.createdAt),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  followedBy: many(follows, { relationName: "following" }),
  following: many(follows, { relationName: "follower" }),
  ratings: many(ratings),
  reviews: many(reviews),
  reviewLikes: many(reviewLikes),
  feedEvents: many(feedEvents),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  albums: many(albums),
  tracks: many(tracks),
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
  artist: one(artists, { fields: [albums.artistId], references: [artists.id] }),
  tracks: many(tracks),
}));

export const tracksRelations = relations(tracks, ({ one }) => ({
  album: one(albums, { fields: [tracks.albumId], references: [albums.id] }),
  artist: one(artists, { fields: [tracks.artistId], references: [artists.id] }),
}));

export const ratingsRelations = relations(ratings, ({ one, many }) => ({
  user: one(users, { fields: [ratings.userId], references: [users.id] }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  rating: one(ratings, {
    fields: [reviews.ratingId],
    references: [ratings.id],
  }),
  likes: many(reviewLikes),
}));

export const reviewLikesRelations = relations(reviewLikes, ({ one }) => ({
  user: one(users, { fields: [reviewLikes.userId], references: [users.id] }),
  review: one(reviews, {
    fields: [reviewLikes.reviewId],
    references: [reviews.id],
  }),
}));

export const feedEventsRelations = relations(feedEvents, ({ one }) => ({
  actor: one(users, { fields: [feedEvents.actorId], references: [users.id] }),
}));

// ─── Inferred types ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;
export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ReviewLike = typeof reviewLikes.$inferSelect;
export type FeedEvent = typeof feedEvents.$inferSelect;
export type NewFeedEvent = typeof feedEvents.$inferInsert;
