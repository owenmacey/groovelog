import { PageShell } from "@/components/layout/PageShell";

function SkeletonActivityRow() {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2 pt-1">
        <div className="skeleton h-3.5 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

export default function FeedLoading() {
  return (
    <PageShell>
      <div className="flex border-b border-border-default mb-6">
        <div className="px-4 py-2.5">
          <div className="skeleton h-4 w-20 rounded" />
        </div>
        <div className="px-4 py-2.5">
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      </div>
      <div className="divide-y divide-border-default">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonActivityRow key={i} />
        ))}
      </div>
    </PageShell>
  );
}
