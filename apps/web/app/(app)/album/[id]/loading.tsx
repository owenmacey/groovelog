import { PageShell } from "@/components/layout/PageShell";

export default function AlbumLoading() {
  return (
    <PageShell>
      <div className="space-y-10">
        {/* Hero */}
        <div className="flex gap-6 sm:gap-8">
          <div className="skeleton flex-shrink-0 w-36 sm:w-52 aspect-square rounded-lg" />
          <div className="flex-1 min-w-0 space-y-5 pt-1">
            <div className="space-y-2">
              <div className="skeleton h-8 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/3 rounded" />
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

        {/* Track list */}
        <section>
          <div className="skeleton h-6 w-20 rounded mb-3" />
          <div className="rounded-lg border border-border-default divide-y divide-border-default overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="skeleton h-4 w-5 rounded" />
                <div className="skeleton h-4 flex-1 rounded" />
                <div className="skeleton h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        </section>

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
