import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { formatRating, formatCount } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Groovelog — Your music, rated.",
};

interface MockReview {
  id: string;
  albumTitle: string;
  artist: string;
  displayName: string;
  username: string;
  rating: number;
  body: string;
  likeCount: number;
  timeAgo: string;
}

const MOCK_REVIEWS: MockReview[] = [
  {
    id: "1",
    albumTitle: "In Rainbows",
    artist: "Radiohead",
    displayName: "meredith k.",
    username: "meredithk",
    rating: 10,
    body: "Thom Yorke's most human record. Every track earns its place — from the quiet devastation of 'Nude' to the slow-burn ecstasy of 'Reckoner'. This is what music sounds like when a band stops trying to prove anything.",
    likeCount: 42,
    timeAgo: "3 days ago",
  },
  {
    id: "2",
    albumTitle: "To Pimp a Butterfly",
    artist: "Kendrick Lamar",
    displayName: "omar_s",
    username: "omars",
    rating: 9,
    body: "Uncomfortable in the best way possible. The jazz underpinning everything gives it a warmth that makes the political weight bearable. 'Mortal Man' still hits different every single time.",
    likeCount: 38,
    timeAgo: "1 week ago",
  },
  {
    id: "3",
    albumTitle: "Rumours",
    artist: "Fleetwood Mac",
    displayName: "cassandra h.",
    username: "cassandrah",
    rating: 8,
    body: "Divorce music that still sounds like joy. The harmonies on 'The Chain' could carry an entire record on their own. Nicks and McVie writing through pain and somehow producing warmth — it's a minor miracle.",
    likeCount: 31,
    timeAgo: "2 weeks ago",
  },
];

function VinylPlaceholder() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StaticReviewCard({ review }: { review: MockReview }) {
  return (
    <div className="rounded-lg bg-bg-surface border border-border-default p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-text-secondary uppercase leading-none">
              {review.displayName.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {review.displayName}
            </p>
            <p className="text-xs text-text-tertiary">
              @{review.username} · {review.timeAgo}
            </p>
          </div>
        </div>
        <span className="flex-shrink-0 font-mono text-sm font-bold text-accent-gold">
          {formatRating(review.rating)}
        </span>
      </div>

      {/* Album */}
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-md bg-bg-elevated border border-border-default flex-shrink-0 flex items-center justify-center text-text-tertiary">
          <VinylPlaceholder />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{review.albumTitle}</p>
          <p className="text-xs text-text-tertiary">{review.artist}</p>
        </div>
      </div>

      {/* Body */}
      <p className="text-sm text-text-secondary leading-relaxed line-clamp-4">
        {review.body}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-1.5 pt-1 text-text-tertiary">
        <Heart className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-xs">{formatCount(review.likeCount)}</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="noise-overlay relative min-h-screen bg-bg-base overflow-x-hidden">
      {/* Gold radial pulse */}
      <div className="gold-radial-pulse" aria-hidden="true" />

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pb-16 text-center">
        <div className="animate-in stagger-1">
          <h1
            className="font-display text-7xl sm:text-8xl font-bold text-text-primary leading-none tracking-tight mb-5"
            style={{ textShadow: "0 0 120px rgba(214, 160, 64, 0.25)" }}
          >
            Groovelog
          </h1>
        </div>

        <div className="animate-in stagger-2">
          <p className="text-xl sm:text-2xl text-text-secondary max-w-sm mb-10">
            Your music, rated. Your taste, shared.
          </p>
        </div>

        <div className="animate-in stagger-3 flex items-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-11 px-7 text-base rounded-md bg-accent-gold text-text-inverse font-medium hover:bg-accent-amber transition-colors"
          >
            Start Rating
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-7 text-base rounded-md bg-bg-elevated border border-border-default text-text-primary hover:border-border-strong transition-colors"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* Mock reviews */}
      <section className="relative z-10 pb-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-medium text-text-tertiary uppercase tracking-widest mb-8">
            Built for listeners, by listeners
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MOCK_REVIEWS.map((review) => (
              <StaticReviewCard key={review.id} review={review} />
            ))}
          </div>

          <p className="text-center mt-16 text-sm text-text-tertiary">
            Already have an account?{" "}
            <Link href="/login" className="text-accent-gold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
