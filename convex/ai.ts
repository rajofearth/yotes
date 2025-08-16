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
    return {
      enabled: existing.enabled,
      apiKey: (existing as any).apiKey || (existing as any).apiKeyEnc ? "••••••" : null,
    };
  },
});

export const saveSettings = mutation({
  args: {
    userId: v.id("users"),
    enabled: v.optional(v.boolean()),
    apiKey: v.optional(v.union(v.string(), v.null())),
    apiKeyEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
  },
  handler: async (ctx, { userId, enabled, apiKey, apiKeyEnc }) => {
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
        apiKeyEnc: apiKeyEnc ?? undefined,
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true };
    }
    await ctx.db.patch(existing._id, {
      enabled: enabled ?? existing.enabled,
      apiKeyEnc: apiKeyEnc === undefined ? (existing as any).apiKeyEnc : apiKeyEnc,
      updatedAt: now,
    });
    return { ok: true };
  },
});

export const getSettingsRaw = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("aiSettings")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) return null;
    return { enabled: existing.enabled, apiKeyEnc: (existing as any).apiKeyEnc ?? undefined };
  },
});


