import { Navbar } from "@/components/layout/Navbar";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "full";

const maxWidthClasses: Record<MaxWidth, string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

interface PageShellProps {
  children: React.ReactNode;
  maxWidth?: MaxWidth;
}

export function PageShell({ children, maxWidth = "xl" }: PageShellProps) {
  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />
      <main className={`mx-auto ${maxWidthClasses[maxWidth]} px-4 sm:px-6 py-8`}>
        {children}
      </main>
    </div>
  );
}
