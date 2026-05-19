"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function RegisterForm() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function signIn(email: string, password: string) {
    setIsSigningIn(true);
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      if (!res.ok) {
        router.push("/login");
        return;
      }
      await utils.auth.me.invalidate();
      router.push("/feed");
    } catch {
      router.push("/login");
    } finally {
      setIsSigningIn(false);
    }
  }

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await signIn(email, password);
    },
    onError: (err) => {
      const msg = err.message;
      if (msg.includes("Username")) {
        setFieldErrors((prev) => ({ ...prev, username: msg }));
      } else if (msg.includes("email")) {
        setFieldErrors((prev) => ({ ...prev, email: msg }));
      } else {
        setFormError(msg);
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    registerMutation.mutate({
      email,
      username,
      password,
      displayName: displayName.trim() || undefined,
    });
  }

  const isPending = registerMutation.isPending || isSigningIn;

  return (
    <div className="rounded-lg bg-bg-surface border border-border-default p-6 space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          error={fieldErrors["email"]}
        />
        <Input
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="yourhandle"
          autoComplete="username"
          required
          hint="Letters, numbers, and underscores only"
          error={fieldErrors["username"]}
        />
        <Input
          label="Display name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Optional — defaults to username"
          autoComplete="name"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          hint="At least 8 characters"
          error={fieldErrors["password"]}
        />

        {formError && (
          <p className="text-sm text-error">{formError}</p>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={isPending}
        >
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-accent-gold hover:text-accent-amber transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
