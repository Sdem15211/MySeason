import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const config = {
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        if (!anonymousUser || !newUser) {
          console.error("Missing user data during account linking.");
          throw new Error("Account linking failed due to missing user data.");
        }
        console.log(
          `Linking anonymous user ${anonymousUser.user.id} data to new user ${newUser.user.id}`
        );
        try {
          const updateResult = await db
            .update(analyses)
            .set({ userId: newUser.user.id, updatedAt: new Date() }) // Also update timestamp
            .where(eq(analyses.userId, anonymousUser.user.id))
            .returning({ updatedId: analyses.id });

          console.log(
            `Re-assigned ${updateResult.length} analyses from user ${anonymousUser.user.id} to ${newUser.user.id}`
          );
        } catch (error) {
          console.error("Error migrating data during account linking:", error);
          throw new Error("Failed to migrate data during account linking.");
        }
      },
    }),
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: process.env.AUTH_SECRET,
};

export const auth = betterAuth(config);
export type Session = typeof auth.$Infer.Session;
