import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { catalogRouter } from "./routers/catalog";
import { ratingRouter } from "./routers/rating";
import { reviewRouter } from "./routers/review";
import { userRouter } from "./routers/user";
import { feedRouter } from "./routers/feed";

export const appRouter = router({
  auth: authRouter,
  catalog: catalogRouter,
  rating: ratingRouter,
  review: reviewRouter,
  user: userRouter,
  feed: feedRouter,
});

export type AppRouter = typeof appRouter;
