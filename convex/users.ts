import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const ensure = mutation({
  args: {
    externalId: v.string(),
    email: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    // Optional E2EE bootstrap metadata from client during onboarding
    encSaltB64: v.optional(v.string()),
    encIterations: v.optional(v.number()),
    wrappedDekB64: v.optional(v.string()),
    wrappedDekIvB64: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        displayName: args.displayName,
        avatarUrl: args.avatarUrl,
        // Only set e2ee fields if provided; otherwise leave as-is
        encSaltB64: args.encSaltB64 ?? existing.encSaltB64,
        encIterations: args.encIterations ?? existing.encIterations,
        wrappedDekB64: args.wrappedDekB64 ?? existing.wrappedDekB64,
        wrappedDekIvB64: args.wrappedDekIvB64 ?? existing.wrappedDekIvB64,
        updatedAt: now,
      });
      return existing._id;
    }
    const id = await ctx.db.insert("users", {
      externalId: args.externalId,
      email: args.email,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      encSaltB64: args.encSaltB64,
      encIterations: args.encIterations,
      wrappedDekB64: args.wrappedDekB64,
      wrappedDekIvB64: args.wrappedDekIvB64,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const byExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    return await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
      .unique();
  },
});

export const generateAvatarUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    const url = await ctx.storage.generateUploadUrl();
    return { url };
  },
});

export const setAvatar = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { userId, storageId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(userId, {
      avatarStorageId: storageId,
      // Clear legacy URL if any
      avatarUrl: undefined,
      updatedAt: Date.now(),
    } as any);
    return { ok: true };
  },
});

export const getAvatarUrl = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (!user) return null;
    if ((user as any).avatarStorageId) {
      const url = await ctx.storage.getUrl((user as any).avatarStorageId);
      return url ? { url, updatedAt: user.updatedAt } : null;
    }
    if (user.avatarUrl) return { url: user.avatarUrl, updatedAt: user.updatedAt };
    return null;
  },
});

export const clearAvatar = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const storageId = (user as any).avatarStorageId;
    if (storageId) {
      try { await ctx.storage.delete(storageId); } catch {}
    }
    await ctx.db.patch(userId, { avatarStorageId: undefined, avatarUrl: undefined, updatedAt: Date.now() } as any);
    return { ok: true };
  },
});

export const getMigrationStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { done: false };
    return { done: Boolean((user as any).migrationDone) };
  },
});

export const setMigrationDone = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(userId, { migrationDone: true, updatedAt: Date.now() } as any);
    return { ok: true };
  },
});


