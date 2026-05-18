import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { ZodError } from "zod";
import { getDb } from "@groovelog/db";
import { redis } from "./lib/redis";
import { getAuth } from "./lib/auth";

// ─── Context ──────────────────────────────────────────────────────────────────

export async function createContext({
  req,
  resHeaders,
}: FetchCreateContextFnOptions) {
  const session = await getAuth().api.getSession({ headers: req.headers });

  return {
    db: getDb(),
    redis,
    session,
    req,
    resHeaders,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// ─── tRPC init ────────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

// ─── Middleware ───────────────────────────────────────────────────────────────

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

// ─── Procedures ───────────────────────────────────────────────────────────────

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
