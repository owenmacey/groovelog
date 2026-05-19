import { getAuth } from "@groovelog/api/auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const handler = (request: NextRequest) => getAuth().handler(request);

export { handler as GET, handler as POST };
