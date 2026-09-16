"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import { usernameSchema } from "@groovelog/validators";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Props {
  currentUsername: string;
  usernameChangedAt: string | null;
  onSuccess?: (newUsername: string) => void;
}

const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

export function UsernameChangeForm({ currentUsername, usernameChangedAt, onSuccess }: Props) {
  const utils = trpc.useUtils();
  const [value, setValue] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [displayedUsername, setDisplayedUsername] = useState(currentUsername);

  const unlockDate = usernameChangedAt
    ? new Date(new Date(usernameChangedAt).getTime() + COOLDOWN_MS)
    : null;
  const isLocked = unlockDate ? unlockDate > new Date() : false;

  const mutation = trpc.user.changeUsername.useMutation({
    onSuccess: async (data) => {
      setSuccess(true);
      setDisplayedUsername(data.username);
      setValue("");
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.user.invalidate(),
        utils.feed.invalidate(),
        utils.entry.invalidate(),
      ]);
      onSuccess?.(data.username);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError(null);
    setSuccess(false);
    mutation.reset();

    const result = usernameSchema.safeParse(value);
    if (!result.success) {
      setClientError(result.error.errors[0]?.message ?? "Invalid username");
      return;
    }

    mutation.mutate({ username: value });
  }

  if (isLocked && unlockDate) {
    return (
      <section className="rounded-lg bg-bg-surface border border-border-default p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-text-tertiary flex-shrink-0" />
          <h2 className="font-display text-base font-semibold text-text-primary">Change Username</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Your current username is{" "}
          <span className="font-mono font-medium text-text-primary">@{displayedUsername}</span>.
        </p>
        <div className="rounded-md bg-bg-elevated border border-border-default px-4 py-3">
          <p className="text-sm text-text-secondary">
            You can change your username again on{" "}
            <span className="font-medium text-text-primary">
              {format(unlockDate, "MMMM d, yyyy")}
            </span>
            .
          </p>
        </div>
      </section>
    );
  }

  const serverError = mutation.error?.message;

  return (
    <section className="rounded-lg bg-bg-surface border border-border-default p-6 space-y-4">
      <h2 className="font-display text-base font-semibold text-text-primary">Change Username</h2>
      <p className="text-sm text-text-secondary">
        Your current username is{" "}
        <span className="font-mono font-medium text-text-primary">@{displayedUsername}</span>.
      </p>

      {success && (
        <div className="rounded-md bg-bg-elevated border border-border-default px-4 py-3">
          <p className="text-sm font-medium text-accent-gold">
            Username updated to @{displayedUsername}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New username"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setClientError(null);
            setSuccess(false);
            mutation.reset();
          }}
          placeholder={displayedUsername}
          error={clientError ?? serverError}
          hint={
            !clientError && !serverError
              ? "Letters, numbers, . and _ only. You can change this once every 3 months."
              : undefined
          }
          maxLength={30}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <Button
          type="submit"
          size="sm"
          loading={mutation.isPending}
          disabled={!value.trim()}
        >
          Update username
        </Button>
      </form>
    </section>
  );
}
