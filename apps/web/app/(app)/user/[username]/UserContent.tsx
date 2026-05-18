"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { UserAvatar } from "@/components/social/UserAvatar";
import { FollowButton } from "@/components/social/FollowButton";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trpc } from "@/lib/trpc";
import { formatRating, formatCount } from "@/lib/utils";
import type { RatedPayload, ReviewedPayload } from "@groovelog/db";

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

            {/* Follower / following counts */}
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span>
                <span className="font-mono font-medium text-text-primary">
                  {formatCount(stats.followerCount)}
                </span>{" "}
                followers
              </span>
              <span>
                <span className="font-mono font-medium text-text-primary">
                  {formatCount(stats.followingCount)}
                </span>{" "}
                following
              </span>
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
        <div className="flex items-center gap-8 flex-wrap border-t border-border-default pt-6">
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-text-primary tabular-nums">
              {formatCount(stats.ratingCount)}
            </p>
            <p className="text-xs uppercase tracking-widest text-text-tertiary mt-0.5">
              Ratings
            </p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-text-primary tabular-nums">
              {formatCount(stats.reviewCount)}
            </p>
            <p className="text-xs uppercase tracking-widest text-text-tertiary mt-0.5">
              Reviews
            </p>
          </div>
          {stats.avgRating != null && (
            <div className="text-center">
              <p className="font-mono text-2xl font-bold text-accent-gold tabular-nums">
                {formatRating(stats.avgRating)}
              </p>
              <p className="text-xs uppercase tracking-widest text-text-tertiary mt-0.5">
                Avg rating
              </p>
            </div>
          )}
        </div>

        {/* ── Recent ratings grid ───────────────────────────────────────── */}
        {recentRatings.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-semibold text-text-primary mb-3">
              Recent Ratings
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {recentRatings.map((event) => {
                const p = event.payload as RatedPayload;
                return (
                  <Link
                    key={event.id}
                    href={`/${p.targetType}/${p.spotifyId ?? p.targetId}`}
                    className="relative group block"
                    title={p.title}
                  >
                    <div className="aspect-square rounded-md overflow-hidden bg-bg-elevated">
                      {p.coverUrl ? (
                        <img
                          src={p.coverUrl}
                          alt={p.title}
                          className="h-full w-full object-cover group-hover:opacity-75 transition-opacity"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-text-tertiary">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1}
                          >
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Star rating badge — solid bg to avoid CSS-var opacity issue */}
                    <div className="absolute bottom-1 right-1 bg-bg-base rounded px-1 py-0.5 shadow-sm">
                      <span className="font-mono text-xs font-bold text-accent-gold">
                        {formatRating(p.rating)}
                      </span>
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
              return (
                <div
                  key={event.id}
                  className="rounded-lg bg-bg-surface border border-border-default p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/${p.targetType}/${p.spotifyId ?? p.targetId}`}
                        className="text-sm font-medium text-text-primary hover:text-accent-gold transition-colors line-clamp-1"
                      >
                        {p.title}
                      </Link>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {formatDistanceToNow(new Date(event.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {p.rating != null && (
                      <HalfStarRating value={p.rating} readOnly size="sm" showLabel />
                    )}
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
    </PageShell>
  );
}
