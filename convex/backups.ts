import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const startLog = mutation({
  args: {
    userId: v.id("users"),
    kind: v.union(v.literal("manual"), v.literal("auto")),
  },
  handler: async (ctx, { userId, kind }) => {
    const id = await ctx.db.insert("backups", {
      userId,
      kind,
      status: "pending",
      startedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any);
    return id;
  },
});

export const finishLog = mutation({
  args: {
    id: v.id("backups"),
    status: v.union(v.literal("success"), v.literal("error")),
    bytes: v.optional(v.number()),
    driveFileId: v.optional(v.string()),
    driveWebViewLink: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, status, bytes, driveFileId, driveWebViewLink, error } = args;
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Backup log not found");
    await ctx.db.patch(id, {
      status,
      bytes,
      driveFileId,
      driveWebViewLink,
      error,
      finishedAt: Date.now(),
      updatedAt: Date.now(),
    } as any);
    return id;
  },
});

export const listByUser = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const cursor = ctx.db
      .query("backups")
      .withIndex("byUserStartedAt", q => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 20);
    return cursor;
  },
});

export const getLastSuccessAt = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const items = await ctx.db
      .query("backups")
      .withIndex("byUserFinishedAt", q => q.eq("userId", userId))
      .order("desc")
      .take(50);
    const last = items.find(i => i.status === "success" && typeof i.finishedAt === "number");
    return last?.finishedAt ?? null;
  },
});


