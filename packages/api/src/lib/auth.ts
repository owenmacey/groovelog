import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, users, sessions, accounts, verifications } from "@groovelog/db";
import bcrypt from "bcryptjs";

function createAuth() {
  return betterAuth({
    secret: process.env["BETTER_AUTH_SECRET"],
    baseURL: process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 8,
      password: {
        hash: (password: string) => bcrypt.hash(password, 12),
        verify: ({ hash, password }: { hash: string; password: string }) =>
          bcrypt.compare(password, hash),
      },
    },
    socialProviders: {
      spotify: {
        clientId: process.env["SPOTIFY_CLIENT_ID"] ?? "",
        clientSecret: process.env["SPOTIFY_CLIENT_SECRET"] ?? "",
        scope: ["user-read-email", "user-read-private"],
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (userData) => {
            const emailPrefix =
              userData.email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "_") ??
              "user";
            const suffix = Math.random().toString(36).slice(2, 6);
            const defaultUsername = `${emailPrefix}_${suffix}`.slice(0, 30);
            const record = userData as Record<string, unknown>;

            return {
              data: {
                ...userData,
                username:
                  typeof record["username"] === "string"
                    ? record["username"]
                    : defaultUsername,
                displayName:
                  typeof record["displayName"] === "string"
                    ? record["displayName"]
                    : (userData.name ?? defaultUsername),
              },
            };
          },
        },
      },
    },
  });
}

type AuthInstance = ReturnType<typeof createAuth>;
let _auth: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (!_auth) _auth = createAuth();
  return _auth!;
}

export type Auth = AuthInstance;
