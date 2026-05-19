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
  const [isFollowing, setIsFollowing] = useState(serverValue);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setIsFollowing(serverValue);
  }, [serverValue]);

  const followMutation = trpc.user.follow.useMutation({
    onMutate: () => {
      const next = !isFollowing;
      setIsFollowing(next);
      utils.user.getProfile.setData({ username }, (old) => {
        if (!old) return old;
        return {
          ...old,
          isFollowing: next,
          stats: { ...old.stats, followerCount: old.stats.followerCount + (next ? 1 : -1) },
        };
      });
    },
    onError: () => {
      setIsFollowing(serverValue);
      utils.user.getProfile.setData({ username }, (old) => {
        if (!old) return old;
        return { ...old, isFollowing: serverValue };
      });
      toast.error("Failed to update follow");
    },
    onSettled: () => {
      void utils.user.getProfile.invalidate({ username });
      void utils.user.getFollowers.invalidate();
      void utils.user.getFollowing.invalidate();
      void utils.user.search.invalidate();
    },
  });

  const pending = followMutation.isPending;
  const showUnfollow = isFollowing && isHovered && !pending;

  return (
    <Button
      variant={showUnfollow ? "danger" : isFollowing ? "secondary" : "primary"}
      size="sm"
      loading={pending}
      onClick={() => followMutation.mutate({ userId })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showUnfollow ? "Unfollow" : isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
