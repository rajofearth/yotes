import { mutation, query } from "./_generated/server";
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


