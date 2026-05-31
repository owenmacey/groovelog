"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { BookOpen, Music, Calendar, Camera } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { UserAvatar } from "@/components/social/UserAvatar";
import { DayOneBadge } from "@/components/social/DayOneBadge";
import { FollowButton } from "@/components/social/FollowButton";
import { UserListModal } from "@/components/social/UserListModal";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { trpc } from "@/lib/trpc";
import { formatRating, formatCount } from "@/lib/utils";

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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setAvatarUrl(data.url ?? "");
      toast.success("Photo uploaded — click Save to apply");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  const initial0 = initial.displayName.charAt(0).toUpperCase();

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

      {/* ── Avatar upload ────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar preview"
            className="h-16 w-16 rounded-full object-cover border border-border-default flex-shrink-0"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-xl font-medium text-text-secondary flex-shrink-0">
            {initial0}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-3.5 w-3.5" />
            Upload Photo
          </Button>
          <p className="text-xs text-text-tertiary">JPG, PNG or WebP · max 5 MB</p>
        </div>
      </div>

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
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={isPending} disabled={isUploading}>
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

  const isOwnProfile = data?.isOwnProfile ?? false;

  // Published entries (8 + 1 to detect overflow)
  const entriesQuery = trpc.entry.listUserEntries.useQuery(
    { username, limit: 8 },
    { enabled: !!data }
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

  const { user, stats, isFollowing } = data;
  const entries = entriesQuery.data?.items ?? [];
  const hasMoreEntries = !!entriesQuery.data?.nextCursor;

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
                {user.isDayOne && (
                  <span className="inline-block align-middle ml-2 -mt-1">
                    <DayOneBadge size="md" />
                  </span>
                )}
              </h1>
              <p className="text-sm text-text-tertiary mt-0.5">@{user.username}</p>
              {user.bio && (
                <p className="text-sm text-text-secondary mt-2 leading-relaxed max-w-prose">
                  {user.bio}
                </p>
              )}
            </div>

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
            <BookOpen className="h-4 w-4 text-text-tertiary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-mono text-2xl font-bold text-text-primary tabular-nums leading-none">
                {formatCount(stats.entryCount)}
              </p>
              <p className="text-xs uppercase tracking-widest text-text-tertiary mt-1">
                Entries
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Music className="h-4 w-4 text-text-tertiary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-mono text-2xl font-bold text-text-primary tabular-nums leading-none">
                {formatCount(stats.tracksRated)}
              </p>
              <p className="text-xs uppercase tracking-widest text-text-tertiary mt-1">
                Tracks rated
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

        {/* ── Entries grid ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Entries
            </h2>
            {hasMoreEntries && (
              <Link
                href={`/user/${username}/entries`}
                className="text-xs text-accent-gold hover:text-accent-amber transition-colors font-medium"
              >
                View all entries →
              </Link>
            )}
          </div>

          {entriesQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton aspect-square rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-text-tertiary py-8 text-center">
              No published entries yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {entries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/entry/${entry.id}`}
                  className="group block"
                  title={entry.album.title}
                >
                  <div className="rounded-lg overflow-hidden bg-bg-elevated border border-border-default">
                    <div className="relative aspect-square overflow-hidden">
                      {entry.album.coverUrl ? (
                        <img
                          src={entry.album.coverUrl}
                          alt={entry.album.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <DiscPlaceholder className="h-full w-full" />
                      )}

                      {/* Rating overlay */}
                      {entry.overallRating !== null && entry.overallRating !== undefined && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-base/90 to-transparent pt-6 pb-1.5 px-2">
                          <HalfStarRating
                            value={entry.overallRating}
                            readOnly
                            size="sm"
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-2 space-y-0.5">
                      <p className="text-xs font-medium text-text-primary truncate leading-tight">
                        {entry.album.title}
                      </p>
                      <p className="text-xs text-text-tertiary truncate">
                        {entry.album.artist.name}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

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
