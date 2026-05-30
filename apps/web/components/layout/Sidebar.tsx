import Link from "next/link";
import { Home, Search, Rss, User, Users, UserCheck, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  username?: string;
  className?: string;
}

export function Sidebar({ username, className }: SidebarProps) {
  return (
    <aside className={cn("w-52 shrink-0", className)}>
      <nav className="sticky top-20 space-y-1">
        <SidebarLink href="/" icon={Home} label="Home" />
        <SidebarLink href="/feed" icon={Rss} label="Feed" />
        <SidebarLink href="/search" icon={Search} label="Search" />
        <SidebarLink href="/search?type=people" icon={Users} label="People" />
        <SidebarLink href="/following" icon={UserCheck} label="Following" />
        {username && (
          <>
            <SidebarLink href="/drafts" icon={PenLine} label="Drafts" />
            <SidebarLink href={`/user/${username}`} icon={User} label="Profile" />
          </>
        )}
      </nav>
    </aside>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2",
        "text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
        "transition-colors"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
