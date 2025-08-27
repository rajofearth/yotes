import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("notes").withIndex("byUser", (q) => q.eq("userId", userId)).collect();
  },
});

export const get = query({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    titleEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
    descriptionEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
    contentEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
    tags: v.array(v.id("tags")),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("notes", {
      userId: args.userId,
      titleEnc: args.titleEnc,
      descriptionEnc: args.descriptionEnc,
      contentEnc: args.contentEnc,
      tags: args.tags,
      createdAt: args.createdAt ?? now,
      updatedAt: args.updatedAt ?? now,
    });
    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    id: v.id("notes"),
    titleEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
    descriptionEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
    contentEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
    tags: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, { id, titleEnc, descriptionEnc, contentEnc, tags }) => {
    const note = await ctx.db.get(id);
    if (!note) throw new Error("Note not found");
    await ctx.db.patch(id, {
      titleEnc: titleEnc ?? note.titleEnc,
      descriptionEnc: descriptionEnc ?? note.descriptionEnc,
      contentEnc: contentEnc ?? note.contentEnc,
      tags: tags ?? note.tags,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const note = await ctx.db.get(id);
    if (!note) throw new Error("Note not found");
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
      .query("notes")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});


