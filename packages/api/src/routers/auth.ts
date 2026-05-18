import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { users, accounts } from "@groovelog/db";
import { registerSchema, loginSchema } from "@groovelog/validators";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { auth } from "../lib/auth";

export const authRouter = router({
  // Register creates the user + credential account manually so we can store username.
  // After registration the client must call auth.login to get a session cookie.
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      // Username uniqueness check
      const existingUsername = await ctx.db.query.users.findFirst({
        where: eq(users.username, input.username),
      });
      if (existingUsername) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username is already taken",
        });
      }

      // Email uniqueness check
      const existingEmail = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (existingEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with that email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const userId = createId();
      const displayName = input.displayName ?? input.username;

      await ctx.db.insert(users).values({
        id: userId,
        name: displayName,
        email: input.email,
        emailVerified: false,
        username: input.username,
        displayName,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await ctx.db.insert(accounts).values({
        id: createId(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true };
    }),

  // Login delegates to Better Auth which verifies the password and sets a session cookie.
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      let response: Response;
      try {
        response = await auth.api.signInEmail({
          body: { email: input.email, password: input.password },
          asResponse: true,
        });
      } catch (err) {
        console.error("[login] auth.api.signInEmail threw:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Auth service error",
          cause: err,
        });
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "(unreadable body)");
        console.error(
          `[login] signInEmail returned ${response.status}:`,
          body
        );
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Forward the session cookie to the client
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        ctx.resHeaders.append("set-cookie", setCookie);
      }

      const data = (await response.json()) as { user: unknown };
      return { success: true, user: data.user };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const response = await auth.api.signOut({
      headers: ctx.req.headers,
      asResponse: true,
    });

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      ctx.resHeaders.append("set-cookie", setCookie);
    }

    return { success: true };
  }),

  loginWithSpotify: publicProcedure.mutation(async ({ ctx }) => {
    const baseUrl =
      process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000";
    // Better Auth's Spotify OAuth entry point — client navigates to this URL
    const callbackURL = `${process.env["NEXT_PUBLIC_APP_URL"] ?? baseUrl}/feed`;
    return {
      url: `${baseUrl}/api/auth/sign-in/spotify?callbackURL=${encodeURIComponent(callbackURL)}`,
    };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return null;

    // Fetch full user record with our custom fields
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
    });

    return user ?? null;
  }),

  // Internal: get the authenticated user's credential account to verify password changes
  verifyPassword: protectedProcedure
    .input(loginSchema.pick({ password: true }))
    .mutation(async ({ input, ctx }) => {
      const account = await ctx.db.query.accounts.findFirst({
        where: and(
          eq(accounts.userId, ctx.user.id),
          eq(accounts.providerId, "credential")
        ),
      });

      if (!account?.password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No password set on this account",
        });
      }

      const valid = await bcrypt.compare(input.password, account.password);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong password" });
      }

      return { verified: true };
    }),
});
