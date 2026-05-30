"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { trpc } from "@/lib/trpc";

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

export default function DraftsPage() {
  const { data: me, isLoading: meLoading } = trpc.auth.me.useQuery();
  const { data: drafts, isLoading } = trpc.entry.listDrafts.useQuery(undefined, {
    enabled: !!me,
  });

  return (
    <PageShell>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-text-primary">Drafts</h1>

        {meLoading || isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton aspect-square rounded-lg" />
            ))}
          </div>
        ) : !me ? (
          <div className="py-16 text-center">
            <p className="text-text-secondary text-sm">Sign in to view your drafts.</p>
          </div>
        ) : !drafts || drafts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-secondary text-sm">No drafts yet. Start writing!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {drafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/album/${draft.album.spotifyId}?log=1`}
                className="group block"
                title={draft.album.title}
              >
                <div className="rounded-lg overflow-hidden bg-bg-elevated border border-border-default">
                  <div className="relative aspect-square overflow-hidden">
                    {draft.album.coverUrl ? (
                      <img
                        src={draft.album.coverUrl}
                        alt={draft.album.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-60"
                      />
                    ) : (
                      <DiscPlaceholder className="h-full w-full" />
                    )}

                    <div className="absolute top-1.5 left-1.5">
                      <span className="text-xs font-mono bg-bg-base/90 text-text-secondary px-1.5 py-0.5 rounded border border-border-default">
                        Draft
                      </span>
                    </div>
                  </div>

                  <div className="p-2 space-y-0.5">
                    <p className="text-xs font-medium text-text-primary truncate leading-tight">
                      {draft.album.title}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      {draft.album.artist.name}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
