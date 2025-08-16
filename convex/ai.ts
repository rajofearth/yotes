import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getSettings = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, { userId }) => {
    if (!userId) return { enabled: false, apiKey: null };
    const existing = await ctx.db
      .query("aiSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) return { enabled: false, apiKey: null };
    // Do not leak raw API key to client; return masked placeholder
    return {
      enabled: existing.enabled,
      apiKey: existing.apiKey ? "••••••" : null,
    };
  },
});

export const saveSettings = mutation({
  args: {
    userId: v.id("users"),
    enabled: v.optional(v.boolean()),
    apiKey: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { userId, enabled, apiKey }) => {
    const existing = await ctx.db
      .query("aiSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();
    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("aiSettings", {
        userId,
        provider: "gemini",
        enabled: enabled ?? false,
        apiKey: apiKey ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true };
    }
    await ctx.db.patch(existing._id, {
      enabled: enabled ?? existing.enabled,
      apiKey: apiKey === undefined ? existing.apiKey : apiKey,
      updatedAt: now,
    });
    return { ok: true };
  },
});


