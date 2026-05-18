import { PageShell } from "@/components/layout/PageShell";

export default function TrackLoading() {
  return (
    <PageShell>
      <div className="space-y-10">
        {/* Hero */}
        <div className="flex gap-6 sm:gap-8">
          <div className="skeleton flex-shrink-0 w-28 sm:w-40 aspect-square rounded-lg" />
          <div className="flex-1 min-w-0 space-y-5 pt-1">
            <div className="space-y-2">
              <div className="skeleton h-8 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-8 w-48 rounded" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-6 w-40 rounded" />
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section className="space-y-3">
          <div className="skeleton h-6 w-20 rounded" />
          <div className="skeleton h-28 w-full rounded-lg" />
          <div className="skeleton h-28 w-full rounded-lg" />
        </section>
      </div>
    </PageShell>
  );
}
