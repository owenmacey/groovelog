"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { UserAvatar } from "@/components/social/UserAvatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function Navbar() {
  const router = useRouter();
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      router.push("/login");
    },
    onError: () => toast.error("Failed to sign out"),
  });

  return (
    <header className="sticky top-0 z-50 border-b border-border-default bg-bg-base/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-xl font-semibold text-text-primary hover:text-accent-gold transition-colors shrink-0"
          >
            Groovelog
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink href="/feed">Feed</NavLink>
            <NavLink href="/search">
              <Search className="h-3.5 w-3.5" />
              Search
            </NavLink>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href={`/user/${user.username}`} className="flex-shrink-0">
                  <UserAvatar user={user} size="sm" />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/login")}
                >
                  Sign in
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push("/register")}
                >
                  Join
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5",
        "text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
        "transition-colors",
        className
      )}
    >
      {children}
    </Link>
  );
}
