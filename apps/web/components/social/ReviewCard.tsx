"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Heart } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";
import { UserAvatar } from "@/components/social/UserAvatar";
import { HalfStarRating } from "@/components/rating/HalfStarRating";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { User } from "@groovelog/db";

interface ReviewForCard {
  id: string;
  targetType: "album" | "track";
  spotifyId: string;
  body: string;
  containsSpoilers: boolean;
  createdAt: Date;
  user: Pick<User, "username" | "displayName" | "avatarUrl">;
  rating: { rating: number } | null;
  likeCount: number;
  isLiked: boolean;
}

interface ReviewCardProps {
  review: ReviewForCard;
}

export function ReviewCard({ review }: ReviewCardProps) {
  console.log("[ReviewCard] review object:", JSON.stringify(review, null, 2));
  const [liked, setLiked] = useState(review.isLiked);
  const [likeCount, setLikeCount] = useState(review.likeCount);
  const [expanded, setExpanded] = useState(false);

  const likeMutation = trpc.review.like.useMutation({
    onMutate: () => {
      const wasLiked = liked;
      setLiked(!wasLiked);
      setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    },
    onError: () => {
      setLiked(review.isLiked);
      setLikeCount(review.likeCount);
      toast.error("Failed to update like");
    },
  });

  const isLong = review.body.length > 400;

  return (
    <div className="rounded-lg bg-bg-surface border border-border-default p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatar user={review.user} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {review.user.displayName}
            </p>
            <p className="text-xs text-text-tertiary">
              @{review.user.username} ·{" "}
              {formatDistanceToNow(review.createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>

        {review.rating && (
          <HalfStarRating
            value={review.rating.rating}
            readOnly
            size="sm"
            showLabel
          />
        )}
      </div>

      {/* Body */}
      <div>
        <p
          className={cn(
            "text-sm text-text-primary leading-relaxed whitespace-pre-line",
            !expanded && isLong && "line-clamp-4"
          )}
        >
          {review.body}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-xs text-accent-gold hover:text-accent-amber transition-colors"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => likeMutation.mutate({ reviewId: review.id })}
            disabled={likeMutation.isPending}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              liked ? "text-accent-gold" : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <Heart className="h-3.5 w-3.5" fill={liked ? "currentColor" : "none"} />
            <span>{formatCount(likeCount)}</span>
          </button>

          {review.containsSpoilers && (
            <span className="text-xs text-warning border border-border-accent px-1.5 py-0.5 rounded-sm">
              Spoilers
            </span>
          )}
        </div>

        {review.spotifyId && (
          <Link
            href={`/${review.targetType}/${review.spotifyId}`}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {review.targetType} →
          </Link>
        )}
      </div>
    </div>
  );
}
