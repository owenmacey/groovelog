"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { UserAvatar } from "@/components/social/UserAvatar";
import { DayOneBadge } from "@/components/social/DayOneBadge";
import { FollowButton } from "@/components/social/FollowButton";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";

interface UserListModalProps {
  userId: string;
  mode: "followers" | "following";
  isOpen: boolean;
  onClose: () => void;
  /** If provided, the Follow button is hidden for this user id (the viewer themselves) */
  viewerUserId?: string | null;
}

export function UserListModal({
  userId,
  mode,
  isOpen,
  onClose,
  viewerUserId,
}: UserListModalProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-md bg-bg-surface border border-border-default rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default shrink-0">
          <h2 className="font-display text-base font-semibold text-text-primary">
            {mode === "followers" ? "Followers" : "Following"}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-7 w-7 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto flex-1">
          {mode === "followers" ? (
            <FollowersList userId={userId} viewerUserId={viewerUserId} />
          ) : (
            <FollowingList userId={userId} viewerUserId={viewerUserId} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Followers list ───────────────────────────────────────────────────────────

function FollowersList({
  userId,
  viewerUserId,
}: {
  userId: string;
  viewerUserId?: string | null;
}) {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    trpc.user.getFollowers.useInfiniteQuery(
      { userId, limit: 20 },
      { getNextPageParam: (page) => page.nextCursor }
    );

  if (isLoading) return <ListSkeleton />;

  const users = data?.pages.flatMap((p) => p.items) ?? [];
  if (users.length === 0) {
    return <EmptyState message="No followers yet" />;
  }

  return (
    <UserRows
      users={users}
      viewerUserId={viewerUserId}
      hasNextPage={!!hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => void fetchNextPage()}
    />
  );
}

// ─── Following list ───────────────────────────────────────────────────────────

function FollowingList({
  userId,
  viewerUserId,
}: {
  userId: string;
  viewerUserId?: string | null;
}) {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    trpc.user.getFollowing.useInfiniteQuery(
      { userId, limit: 20 },
      { getNextPageParam: (page) => page.nextCursor }
    );

  if (isLoading) return <ListSkeleton />;

  const users = data?.pages.flatMap((p) => p.items) ?? [];
  if (users.length === 0) {
    return <EmptyState message="Not following anyone yet" />;
  }

  return (
    <UserRows
      users={users}
      viewerUserId={viewerUserId}
      hasNextPage={!!hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => void fetchNextPage()}
    />
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

type UserItem = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing: boolean;
  isDayOne: boolean;
};

function UserRows({
  users,
  viewerUserId,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  users: UserItem[];
  viewerUserId?: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="py-2">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-3 px-5 py-3 hover:bg-bg-elevated transition-colors"
        >
          <Link href={`/user/${user.username}`} className="shrink-0">
            <UserAvatar user={user} size="sm" />
          </Link>
          <Link href={`/user/${user.username}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <p className="text-sm font-medium text-text-primary truncate leading-snug flex items-center gap-1.5">
              {user.displayName}
              {user.isDayOne && <DayOneBadge />}
            </p>
            <p className="text-xs text-text-tertiary truncate">@{user.username}</p>
          </Link>
          {viewerUserId !== user.id && (
            <FollowButton
              userId={user.id}
              username={user.username}
              isFollowing={user.isFollowing}
            />
          )}
        </div>
      ))}
      {hasNextPage && (
        <div className="flex justify-center py-3">
          <Button
            variant="secondary"
            size="sm"
            loading={isFetchingNextPage}
            onClick={onLoadMore}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="py-4 px-5 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-bg-elevated shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded bg-bg-elevated" />
            <div className="h-2.5 w-20 rounded bg-bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-text-tertiary text-sm">{message}</div>
  );
}
