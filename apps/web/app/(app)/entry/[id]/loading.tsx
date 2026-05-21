import { PageShell } from "@/components/layout/PageShell";

export default function EntryLoading() {
  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Author header */}
        <div className="flex items-center gap-3">
          <div className="skeleton h-8 w-8 rounded-full" />
          <div className="space-y-1.5">
            <div className="skeleton h-3.5 w-28 rounded" />
            <div className="skeleton h-3 w-44 rounded" />
          </div>
        </div>

        {/* Album card */}
        <div className="flex gap-5">
          <div className="skeleton flex-shrink-0 w-28 sm:w-36 aspect-square rounded-lg" />
          <div className="flex-1 min-w-0 pt-1 space-y-3">
            <div className="space-y-1.5">
              <div className="skeleton h-6 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/3 rounded" />
            </div>
            <div className="skeleton h-6 w-36 rounded" />
          </div>
        </div>

        {/* Review body */}
        <div className="rounded-xl border border-border-default p-5 space-y-2">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
          <div className="skeleton h-4 w-4/6 rounded" />
        </div>

        {/* Track ratings */}
        <div className="space-y-3">
          <div className="skeleton h-3 w-24 rounded" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-1.5">
              <div className="skeleton h-3 w-5 rounded" />
              <div className="skeleton h-3 flex-1 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border-default pt-4">
          <div className="skeleton h-4 w-12 rounded" />
        </div>
      </div>
    </PageShell>
  );
}
