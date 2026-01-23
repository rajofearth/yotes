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
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", args.externalId))
      .unique();
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

    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", args.email))
      .unique();
    if (existingByEmail) {
      const oldExternalId = existingByEmail.externalId;
      await ctx.db.patch(existingByEmail._id, {
        externalId: args.externalId,
        displayName: args.displayName ?? existingByEmail.displayName,
        avatarUrl: args.avatarUrl ?? existingByEmail.avatarUrl,
        encSaltB64: args.encSaltB64 ?? existingByEmail.encSaltB64,
        encIterations: args.encIterations ?? existingByEmail.encIterations,
        wrappedDekB64: args.wrappedDekB64 ?? existingByEmail.wrappedDekB64,
        wrappedDekIvB64: args.wrappedDekIvB64 ?? existingByEmail.wrappedDekIvB64,
        updatedAt: now,
      });

      if (oldExternalId !== args.externalId) {
        await ctx.db.insert("userIdMap", {
          oldExternalId,
          newExternalId: args.externalId,
          userId: existingByEmail._id,
          createdAt: now,
        });
      }

      return existingByEmail._id;
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

export const listAllUsersForMigration = query({
  args: { adminToken: v.string() },
  handler: async (ctx, { adminToken }) => {
    const expected = process.env.MIGRATION_ADMIN_TOKEN;
    if (!expected || adminToken !== expected) {
      throw new Error("Forbidden");
    }
    return await ctx.db.query("users").collect();
  },
});

export const migrateExternalIds = mutation({
  args: {
    adminToken: v.string(),
    mappings: v.array(
      v.object({
        oldExternalId: v.string(),
        newExternalId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { adminToken, mappings }) => {
    const expected = process.env.MIGRATION_ADMIN_TOKEN;
    if (!expected || adminToken !== expected) {
      throw new Error("Forbidden");
    }

    const results: Array<{
      oldExternalId: string;
      newExternalId: string;
      status: "updated" | "missing" | "conflict";
    }> = [];

    const now = Date.now();
    for (const mapping of mappings) {
      const existingNew = await ctx.db
        .query("users")
        .withIndex("byExternalId", (q) => q.eq("externalId", mapping.newExternalId))
        .unique();
      if (existingNew) {
        results.push({
          oldExternalId: mapping.oldExternalId,
          newExternalId: mapping.newExternalId,
          status: "conflict",
        });
        continue;
      }

      const user = await ctx.db
        .query("users")
        .withIndex("byExternalId", (q) => q.eq("externalId", mapping.oldExternalId))
        .unique();
      if (!user) {
        results.push({
          oldExternalId: mapping.oldExternalId,
          newExternalId: mapping.newExternalId,
          status: "missing",
        });
        continue;
      }

      await ctx.db.patch(user._id, {
        externalId: mapping.newExternalId,
        updatedAt: now,
      });
      await ctx.db.insert("userIdMap", {
        oldExternalId: mapping.oldExternalId,
        newExternalId: mapping.newExternalId,
        userId: user._id,
        createdAt: now,
      });
      results.push({
        oldExternalId: mapping.oldExternalId,
        newExternalId: mapping.newExternalId,
        status: "updated",
      });
    }

    return { ok: true, results };
  },
});


