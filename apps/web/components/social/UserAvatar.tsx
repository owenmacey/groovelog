import { cn } from "@/lib/utils";
import type { User } from "@groovelog/db";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<Size, string> = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-14 w-14 text-xl",
  xl: "h-20 w-20 text-2xl",
};

interface UserAvatarProps {
  user: Pick<User, "avatarUrl" | "displayName" | "username">;
  size?: Size;
  className?: string;
}

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const initial = user.displayName.charAt(0).toUpperCase();

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        className={cn(
          "rounded-full object-cover flex-shrink-0",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      aria-label={user.displayName}
      className={cn(
        "rounded-full bg-bg-elevated border border-border-default",
        "flex items-center justify-center text-text-secondary font-medium flex-shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {initial}
    </div>
  );
}
