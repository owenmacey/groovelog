import { getAuth } from "@groovelog/api/auth";
import type { NextRequest } from "next/server";

const handler = (request: NextRequest) => getAuth().handler(request);

export { handler as GET, handler as POST };
