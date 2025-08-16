import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("tags")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, { userId, name, color }) => {
    const existing = await ctx.db
      .query("tags")
      .withIndex("byUserName", (q) => q.eq("userId", userId).eq("name", name))
      .unique();
    if (existing) throw new Error(`Tag "${name}" exists.`);
    const now = Date.now();
    const id = await ctx.db.insert("tags", {
      userId,
      name,
      color,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: { id: v.id("tags"), name: v.optional(v.string()), color: v.optional(v.string()) },
  handler: async (ctx, { id, name, color }) => {
    const tag = await ctx.db.get(id);
    if (!tag) throw new Error("Tag not found");
    if (name && name.trim() === "") throw new Error("Tag name required.");
    await ctx.db.patch(id, {
      name: name ?? tag.name,
      color: color ?? tag.color,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});


