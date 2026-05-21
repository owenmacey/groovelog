import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { catalogRouter } from "./routers/catalog";
import { entryRouter } from "./routers/entry";
import { ratingRouter } from "./routers/rating";
import { userRouter } from "./routers/user";
import { feedRouter } from "./routers/feed";

export const appRouter = router({
  auth: authRouter,
  catalog: catalogRouter,
  entry: entryRouter,
  rating: ratingRouter,
  user: userRouter,
  feed: feedRouter,
});

export type AppRouter = typeof appRouter;
