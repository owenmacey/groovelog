import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@groovelog/api";
import { createContext } from "@groovelog/api/trpc";

export const dynamic = "force-dynamic";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError:
      process.env["NODE_ENV"] === "development"
        ? ({ path, error }) => {
            console.error(`tRPC error on /${path ?? "unknown"}:`, error);
          }
        : undefined,
  });
}

export { handler as GET, handler as POST };
