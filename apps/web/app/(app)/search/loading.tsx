import { PageShell } from "@/components/layout/PageShell";

export default function SearchLoading() {
  return (
    <PageShell>
      <div className="space-y-6">
        <div className="skeleton h-8 w-28 rounded" />
        <div className="skeleton h-11 w-full rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg bg-bg-surface border border-border-default p-3"
            >
              <div className="skeleton h-12 w-12 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
