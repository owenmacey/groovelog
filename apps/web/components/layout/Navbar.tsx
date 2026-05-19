"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Menu, X, Rss, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { UserAvatar } from "@/components/social/UserAvatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function Navbar() {
  const router = useRouter();
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const [menuOpen, setMenuOpen] = useState(false);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      setMenuOpen(false);
      await utils.auth.me.invalidate();
      router.push("/login");
    },
    onError: () => toast.error("Failed to sign out"),
  });

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border-default bg-bg-base/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            onClick={closeMenu}
            className="font-display text-xl font-semibold text-text-primary hover:text-accent-gold transition-colors shrink-0"
          >
            Groovelog
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink href="/feed">
              <Rss className="h-3.5 w-3.5" />
              Feed
            </NavLink>
            <NavLink href="/search">
              <Search className="h-3.5 w-3.5" />
              Search
            </NavLink>
            <NavLink href="/search?type=people">
              <Users className="h-3.5 w-3.5" />
              People
            </NavLink>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href={`/user/${user.username}`} className="flex-shrink-0" onClick={closeMenu}>
                  <UserAvatar user={user} size="sm" />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                  className="hidden sm:inline-flex"
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center justify-center h-7 px-3 text-sm rounded-sm font-body select-none transition-colors text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex items-center justify-center h-7 px-3 text-sm rounded-sm font-medium font-body select-none transition-colors bg-accent-gold text-text-inverse hover:bg-accent-amber"
                >
                  Join
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="sm:hidden flex items-center justify-center h-8 w-8 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-border-default bg-bg-base shadow-lg">
          <nav className="mx-auto max-w-7xl px-4 py-3 space-y-0.5">
            <MobileNavLink href="/feed" onClick={closeMenu}>
              <Rss className="h-4 w-4 shrink-0" />
              Feed
            </MobileNavLink>
            <MobileNavLink href="/search" onClick={closeMenu}>
              <Search className="h-4 w-4 shrink-0" />
              Search
            </MobileNavLink>
            <MobileNavLink href="/search?type=people" onClick={closeMenu}>
              <Users className="h-4 w-4 shrink-0" />
              People
            </MobileNavLink>
            {user && (
              <MobileNavLink href={`/user/${user.username}`} onClick={closeMenu}>
                <UserAvatar user={user} size="xs" />
                Profile
              </MobileNavLink>
            )}

            <div className="pt-3 mt-2 border-t border-border-default">
              {user ? (
                <button
                  className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Signing out…" : "Sign out"}
                </button>
              ) : (
                <div className="flex gap-2 px-3">
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="flex-1 text-center py-2 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMenu}
                    className="flex-1 text-center py-2 rounded-md text-sm font-medium bg-accent-gold text-text-inverse hover:bg-accent-amber transition-colors"
                  >
                    Join
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
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

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
    >
      {children}
    </Link>
  );
}
