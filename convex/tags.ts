import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("tags").withIndex("byUser", (q) => q.eq("userId", userId)).collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    nameEnc: v.object({ ct: v.string(), iv: v.string() }),
    colorEnc: v.object({ ct: v.string(), iv: v.string() }),
  },
  handler: async (ctx, { userId, nameEnc, colorEnc }) => {
    const now = Date.now();
    const id = await ctx.db.insert("tags", {
      userId,
      nameEnc,
      colorEnc,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: { id: v.id("tags"), nameEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })), colorEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })) },
  handler: async (ctx, { id, nameEnc, colorEnc }) => {
    const tag = await ctx.db.get(id);
    if (!tag) throw new Error("Tag not found");
    await ctx.db.patch(id, {
      nameEnc: nameEnc ?? tag.nameEnc,
      colorEnc: colorEnc ?? tag.colorEnc,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, { id }) => {
    const tag = await ctx.db.get(id);
    if (!tag) throw new Error("Tag not found");
    await ctx.db.delete(id);
  },
});

export const secureList = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (!user) return [];
    return await ctx.db
      .query("tags")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .collect();
  },
});


