import { action } from "./_generated/server";
import { v } from "convex/values";
import { createAuth } from "./auth";

const normalizeEmail = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

export const createBetterAuthUsers = action({
  args: {
    adminToken: v.string(),
    users: v.array(
      v.object({
        email: v.string(),
        name: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { adminToken, users }) => {
    const expected = process.env.MIGRATION_ADMIN_TOKEN;
    if (!expected || adminToken !== expected) {
      throw new Error("Forbidden");
    }

    const auth = createAuth(ctx);
    const results: Array<{
      email: string;
      status: "created" | "exists" | "skipped" | "error";
      userId?: string;
      message?: string;
    }> = [];

    for (const user of users) {
      const email = normalizeEmail(user.email);
      if (!email) {
        results.push({ email: user.email, status: "skipped" });
        continue;
      }
      try {
        const name = user.name?.trim() || email.split("@")[0] || "User";
        const password = crypto.randomUUID();
        const created = await auth.api.signUpEmail({
          body: { email, password, name },
        });
        const userId =
          created?.user?.id ||
          created?.data?.user?.id ||
          created?.session?.user?.id ||
          created?.session?.userId ||
          undefined;
        results.push({ email, status: "created", userId });
      } catch (error: any) {
        const message = error?.message || "Unknown error";
        if (message.toLowerCase().includes("already")) {
          results.push({ email, status: "exists" });
        } else {
          results.push({ email, status: "error", message });
        }
      }
    }

    return { ok: true, results };
  },
});
