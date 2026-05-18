"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      router.push("/feed");
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const spotifyMutation = trpc.auth.loginWithSpotify.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error("Failed to start Spotify sign-in");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    loginMutation.mutate({ email, password });
  }

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
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {formError && (
          <p className="text-sm text-error">{formError}</p>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loginMutation.isPending}
        >
          Sign in
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-default" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-bg-surface px-2 text-xs text-text-tertiary">or</span>
        </div>
      </div>

      <Button
        variant="secondary"
        className="w-full"
        size="lg"
        onClick={() => spotifyMutation.mutate()}
        loading={spotifyMutation.isPending}
        type="button"
      >
        Continue with Spotify
      </Button>

      <p className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-accent-gold hover:text-accent-amber transition-colors"
        >
          Join Groovelog
        </Link>
      </p>
    </div>
  );
}
