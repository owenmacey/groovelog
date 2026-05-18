import { auth } from "@groovelog/api/auth";
import type { NextRequest } from "next/server";

const handler = (request: NextRequest) => auth.handler(request);

export { handler as GET, handler as POST };
