"use client";

import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "@groovelog/api";

export { superjson };
export const trpc = createTRPCReact<AppRouter>();
