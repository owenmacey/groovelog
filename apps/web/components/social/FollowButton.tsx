"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FollowButtonProps {
  userId: string;
  username: string;
  isFollowing: boolean;
}

export function FollowButton({
  userId,
  username,
  isFollowing: serverValue,
}: FollowButtonProps) {
  const utils = trpc.useUtils();
  // Local state drives the button immediately; synced from server when not pending
  const [isFollowing, setIsFollowing] = useState(serverValue);

  useEffect(() => {
    setIsFollowing(serverValue);
  }, [serverValue]);

  const followMutation = trpc.user.follow.useMutation({
    onMutate: () => {
      const next = !isFollowing;
      setIsFollowing(next);

      // Also optimistically update the profile page cache (follower count)
      utils.user.getProfile.setData({ username }, (old) => {
        if (!old) return old;
        return {
          ...old,
          isFollowing: next,
          stats: {
            ...old.stats,
            followerCount: old.stats.followerCount + (next ? 1 : -1),
          },
        };
      });
    },
    onError: () => {
      // Roll back both local state and cache
      setIsFollowing(serverValue);
      utils.user.getProfile.setData({ username }, (old) => {
        if (!old) return old;
        return { ...old, isFollowing: serverValue };
      });
      toast.error("Failed to update follow");
    },
    onSettled: () => {
      // Refetch for the true server value
      void utils.user.getProfile.invalidate({ username });
    },
  });

  return (
    <Button
      variant={isFollowing ? "secondary" : "primary"}
      size="sm"
      loading={followMutation.isPending}
      onClick={() => followMutation.mutate({ userId })}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
