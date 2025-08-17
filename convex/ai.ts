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

export const getSummaryCache = query({
  args: { userId: v.id("users"), cacheKey: v.string() },
  handler: async (ctx, { userId, cacheKey }) => {
    const row = await ctx.db
      .query("aiSummaries")
      .withIndex("byUserCacheKey", (q) => q.eq("userId", userId).eq("cacheKey", cacheKey))
      .unique();
    if (!row) return null;
    if (row.expiresAt && row.expiresAt < Date.now()) return null;
    return { summaryEnc: (row as any).summaryEnc, createdAt: row.createdAt, expiresAt: row.expiresAt };
  },
});

export const putSummaryCache = mutation({
  args: {
    userId: v.id("users"),
    cacheKey: v.string(),
    summaryEnc: v.object({ ct: v.string(), iv: v.string() }),
    ttlSeconds: v.optional(v.number()),
  },
  handler: async (ctx, { userId, cacheKey, summaryEnc, ttlSeconds }) => {
    const now = Date.now();
    const expiresAt = ttlSeconds ? now + ttlSeconds * 1000 : undefined;
    const existing = await ctx.db
      .query("aiSummaries")
      .withIndex("byUserCacheKey", (q) => q.eq("userId", userId).eq("cacheKey", cacheKey))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { summaryEnc, createdAt: now, expiresAt });
      return { ok: true };
    }
    await ctx.db.insert("aiSummaries", { userId, cacheKey, summaryEnc, createdAt: now, expiresAt });
    return { ok: true };
  },
});
