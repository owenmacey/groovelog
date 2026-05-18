import { PageShell } from "@/components/layout/PageShell";

export default function UserLoading() {
  return (
    <PageShell>
      <div className="space-y-10">
        {/* Profile header */}
        <div className="flex gap-5 sm:gap-8 items-start">
          <div className="skeleton h-20 w-20 rounded-full flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0 space-y-3">
            <div className="space-y-2">
              <div className="skeleton h-7 w-48 rounded" />
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-4 w-64 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-8 flex-wrap border-t border-border-default pt-6">
          {(["Ratings", "Reviews", "Avg"] as const).map((label) => (
            <div key={label} className="text-center space-y-1.5">
              <div className="skeleton h-8 w-12 mx-auto rounded" />
              <div className="skeleton h-3 w-16 mx-auto rounded" />
            </div>
          ))}
        </div>

        {/* Recent ratings grid */}
        <section>
          <div className="skeleton h-6 w-36 rounded mb-3" />
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton aspect-square rounded-md" />
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
