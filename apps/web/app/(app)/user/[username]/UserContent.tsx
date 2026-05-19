"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { Star, MessageSquare, Calendar, Heart } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { UserAvatar } from "@/components/social/UserAvatar";
import { FollowButton } from "@/components/social/FollowButton";
import { UserListModal } from "@/components/social/UserListModal";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trpc } from "@/lib/trpc";
import { formatRating, formatCount } from "@/lib/utils";
import type { RatedPayload, ReviewedPayload } from "@groovelog/db";

// ── Shared disc placeholder ───────────────────────────────────────────────────

function DiscPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center text-text-tertiary ${className ?? ""}`}>
      <svg viewBox="0 0 24 24" className="w-1/3 h-1/3" fill="none" stroke="currentColor" strokeWidth={1}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </div>
  );
}

// ── Edit profile form ─────────────────────────────────────────────────────────

function EditProfileForm({
  initial,
  onCancel,
  onSave,
  isPending,
}: {
  initial: { displayName: string; bio: string; avatarUrl: string };
  onCancel: () => void;
  onSave: (values: { displayName?: string; bio?: string; avatarUrl?: string }) => void;
  isPending: boolean;
}) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined,
        });
      }}
      className="rounded-lg bg-bg-surface border border-border-default p-4 space-y-4"
    >
      <h2 className="font-display text-base font-semibold text-text-primary">
        Edit Profile
      </h2>
      <Input
        label="Display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        maxLength={100}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell people about yourself…"
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-md bg-bg-elevated border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-gold"
        />
      </div>
      <Input
        label="Avatar URL"
        value={avatarUrl}
        onChange={(e) => setAvatarUrl(e.target.value)}
        placeholder="https://…"
        type="url"
      />
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function UserContent({ username }: { username: string }) {
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();
  const [isEditing, setIsEditing] = useState(false);
  const [modal, setModal] = useState<"followers" | "following" | null>(null);

  const { data, isLoading, error } = trpc.user.getProfile.useQuery({ username });

  const activityQuery = trpc.user.getRecentActivity.useQuery(
    { userId: data?.user.id ?? "", limit: 20 },
    { enabled: !!data?.user.id }
  );

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      void utils.user.getProfile.invalidate({ username });
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="py-16 text-center text-text-tertiary text-sm">Loading…</div>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <div className="py-16 text-center">
          <p className="text-text-secondary text-sm">User not found.</p>
        </div>
      </PageShell>
    );
  }

  const { user, stats, isFollowing, isOwnProfile } = data;
  const activity = activityQuery.data?.items ?? [];
  const recentRatings = activity.filter((e) => e.type === "rated").slice(0, 8);
  const recentReviews = activity.filter((e) => e.type === "reviewed").slice(0, 5);

  return (
    <PageShell>
      <div className="space-y-10">
        {/* ── Profile header ────────────────────────────────────────────── */}
        <div className="flex gap-5 sm:gap-8 items-start">
          <UserAvatar user={user} size="xl" className="flex-shrink-0 mt-1" />

          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-text-primary leading-tight">
                {user.displayName}
              </h1>
              <p className="text-sm text-text-tertiary mt-0.5">@{user.username}</p>
              {user.bio && (
                <p className="text-sm text-text-secondary mt-2 leading-relaxed max-w-prose">
                  {user.bio}
                </p>
              )}
            </div>

            {/* Follower / following counts — clickable to open modal */}
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <button
                onClick={() => setModal("followers")}
                className="hover:text-text-primary transition-colors"
              >
                <span className="font-mono font-medium text-text-primary">
                  {formatCount(stats.followerCount)}
                </span>{" "}
                followers
              </button>
              <button
                onClick={() => setModal("following")}
                className="hover:text-text-primary transition-colors"
              >
                <span className="font-mono font-medium text-text-primary">
                  {formatCount(stats.followingCount)}
                </span>{" "}
                following
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing((v) => !v)}
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              ) : me ? (
                <FollowButton
                  userId={user.id}
                  username={user.username}
                  isFollowing={isFollowing}
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Edit profile form ─────────────────────────────────────────── */}
        {isEditing && isOwnProfile && (
          <EditProfileForm
            initial={{
              displayName: user.displayName,
              bio: user.bio ?? "",
              avatarUrl: user.avatarUrl ?? "",
            }}
            onCancel={() => setIsEditing(false)}
            onSave={(values) => updateMutation.mutate(values)}
            isPending={updateMutation.isPending}
          />
        )}

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start gap-6 border-t border-border-default pt-6">
          <div className="flex items-start gap-2">
            <Star className="h-4 w-4 text-text-tertiary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-mono text-2xl font-bold text-text-primary tabular-nums leading-none">
                {formatCount(stats.ratingCount)}
              </p>
              <p className="text-xs uppercase tracking-widest text-text-tertiary mt-1">
                Ratings
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-text-tertiary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-mono text-2xl font-bold text-text-primary tabular-nums leading-none">
                {formatCount(stats.reviewCount)}
              </p>
              <p className="text-xs uppercase tracking-widest text-text-tertiary mt-1">
                Reviews
              </p>
            </div>
          </div>

          {stats.avgRating != null && (
            <div>
              <p className="font-mono text-2xl font-bold text-accent-gold tabular-nums leading-none">
                {formatRating(stats.avgRating)}
              </p>
              <p className="text-xs uppercase tracking-widest text-text-tertiary mt-1">
                Avg rating
              </p>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-text-tertiary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-text-primary leading-none">
                {format(new Date(user.createdAt), "MMM yyyy")}
              </p>
              <p className="text-xs uppercase tracking-widest text-text-tertiary mt-1">
                Member since
              </p>
            </div>
          </div>
        </div>

        {/* ── Recent ratings grid ───────────────────────────────────────── */}
        {recentRatings.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3">
              Recent Ratings
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {recentRatings.map((event) => {
                const p = event.payload as RatedPayload;
                const href = `/${p.targetType}/${p.spotifyId ?? p.targetId}`;
                return (
                  <Link
                    key={event.id}
                    href={href}
                    className="group block"
                    title={p.title}
                  >
                    <div className="rounded-lg overflow-hidden bg-bg-elevated border border-border-default">
                      {/* Cover art */}
                      <div className="relative aspect-square overflow-hidden">
                        {p.coverUrl ? (
                          <img
                            src={p.coverUrl}
                            alt={p.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <DiscPlaceholder className="h-full w-full bg-bg-elevated" />
                        )}

                        {/* Gold hover overlay */}
                        <div className="absolute inset-0 bg-accent-gold/0 group-hover:bg-accent-gold/20 transition-colors duration-200 flex items-center justify-center">
                          <span className="font-mono text-2xl font-bold text-white drop-shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {formatRating(p.rating)}
                          </span>
                        </div>

                        {/* Static rating badge — hidden on hover */}
                        <div className="absolute bottom-1.5 right-1.5 bg-bg-base/90 rounded px-1 py-0.5 shadow-sm group-hover:opacity-0 transition-opacity">
                          <span className="font-mono text-xs font-bold text-accent-gold">
                            {formatRating(p.rating)}
                          </span>
                        </div>
                      </div>

                      {/* Info below cover */}
                      <div className="p-2 space-y-0.5">
                        <p className="text-xs font-medium text-text-primary truncate leading-tight">
                          {p.title}
                        </p>
                        {"artistName" in event && event.artistName ? (
                          <p className="text-xs text-text-tertiary truncate">
                            {event.artistName as string}
                          </p>
                        ) : null}
                        <HalfStarRating
                          value={p.rating}
                          readOnly
                          size="sm"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Recent reviews ────────────────────────────────────────────── */}
        {recentReviews.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Recent Reviews
            </h2>
            {recentReviews.map((event) => {
              const p = event.payload as ReviewedPayload;
              const href = `/${p.targetType}/${p.spotifyId ?? p.targetId}`;
              const artistName = "artistName" in event ? (event.artistName as string | undefined) : undefined;
              const reviewBody = "reviewBody" in event ? (event.reviewBody as string | undefined) : undefined;
              const likeCount = "likeCount" in event ? (event.likeCount as number | undefined) : undefined;
              return (
                <div
                  key={event.id}
                  className="rounded-lg bg-bg-surface border border-border-default p-4 space-y-3"
                >
                  {/* Album header */}
                  <div className="flex items-start gap-3">
                    <Link href={href} className="flex-shrink-0 block">
                      <div className="w-14 h-14 rounded overflow-hidden bg-bg-elevated">
                        {p.coverUrl ? (
                          <img
                            src={p.coverUrl}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <DiscPlaceholder className="w-full h-full" />
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={href}
                        className="text-sm font-medium text-text-primary hover:text-accent-gold transition-colors line-clamp-1"
                      >
                        {p.title}
                      </Link>
                      {artistName && (
                        <p className="text-xs text-text-tertiary mt-0.5">{artistName}</p>
                      )}
                      {p.rating != null && (
                        <HalfStarRating
                          value={p.rating}
                          readOnly
                          size="sm"
                          showLabel
                          className="mt-1"
                        />
                      )}
                    </div>
                  </div>

                  {/* Review body */}
                  {reviewBody && (
                    <p className="text-sm text-text-primary leading-relaxed line-clamp-3 whitespace-pre-line">
                      {reviewBody}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-border-default">
                    <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                      <Heart className="h-3.5 w-3.5" />
                      <span>{formatCount(likeCount ?? 0)}</span>
                    </div>
                    <time className="text-xs text-text-tertiary">
                      {formatDistanceToNow(new Date(event.createdAt), {
                        addSuffix: true,
                      })}
                    </time>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {recentRatings.length === 0 &&
          recentReviews.length === 0 &&
          !activityQuery.isLoading && (
            <p className="text-sm text-text-tertiary text-center py-8">
              No activity yet.
            </p>
          )}
      </div>

      {/* ── Followers / following modal ───────────────────────────────── */}
      {modal && (
        <UserListModal
          userId={user.id}
          mode={modal}
          isOpen={true}
          onClose={() => setModal(null)}
          viewerUserId={me?.id}
        />
      )}
    </PageShell>
  );
}
