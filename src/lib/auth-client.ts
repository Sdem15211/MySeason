import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [anonymousClient()],
});

export const { signIn, signUp, useSession, signOut } = authClient;
