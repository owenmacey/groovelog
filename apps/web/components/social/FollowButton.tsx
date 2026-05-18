"use client";

import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FollowButtonProps {
  userId: string;
  username: string;
  isFollowing: boolean;
}

export function FollowButton({ userId, username, isFollowing }: FollowButtonProps) {
  const utils = trpc.useUtils();

  const followMutation = trpc.user.follow.useMutation({
    onMutate: async () => {
      await utils.user.getProfile.cancel({ username });
      const prev = utils.user.getProfile.getData({ username });
      utils.user.getProfile.setData({ username }, (old) => {
        if (!old) return old;
        return {
          ...old,
          isFollowing: !old.isFollowing,
          stats: {
            ...old.stats,
            followerCount: old.isFollowing
              ? old.stats.followerCount - 1
              : old.stats.followerCount + 1,
          },
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      utils.user.getProfile.setData({ username }, ctx?.prev);
      toast.error("Failed to update follow");
    },
    onSettled: () => {
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
