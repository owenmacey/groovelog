"use client";

import { PageShell } from "@/components/layout/PageShell";

export default function UserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell>
      <div className="py-16 text-center space-y-4">
        <p className="text-text-secondary text-sm">
          {error.message || "Failed to load profile."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-sm font-medium text-accent-gold hover:underline"
        >
          Try again
        </button>
      </div>
    </PageShell>
  );
}
