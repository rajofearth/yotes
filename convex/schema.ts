import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Supabase user id or other external auth provider id
    externalId: v.string(),
    email: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(), // Date.now() in ms
    updatedAt: v.number(), // Date.now() in ms
  })
    .index("byExternalId", ["externalId"]) // Enforce uniqueness in mutations
    .index("byEmail", ["email"]),

  tags: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(), // Tailwind class e.g. "bg-purple-600/20 text-purple-600"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]) // Query all tags for a user
    .index("byUserName", ["userId", "name"]), // Support uniqueness checks per user

  notes: defineTable({
    userId: v.id("users"),
    // Title/description/content are optional to allow quick notes and empty fields during drafting
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.optional(v.string()),
    // Array of tag references
    tags: v.array(v.id("tags")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]) // Fetch all notes for a user
    .index("byUserUpdatedAt", ["userId", "updatedAt"]), // Sort recent notes efficiently

  // Per-user AI settings. Never return apiKey in query functions.
  aiSettings: defineTable({
    userId: v.id("users"),
    provider: v.literal("gemini"),
    enabled: v.boolean(),
    apiKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]).index("byUserProvider", ["userId", "provider"]),

  // AI request/usage log for observability, rate limiting, and debugging
  aiRequests: defineTable({
    userId: v.id("users"),
    kind: v.union(v.literal("image_to_note"), v.literal("search_summary")),
    provider: v.literal("gemini"),
    model: v.string(),
    status: v.union(v.literal("success"), v.literal("error")),
    error: v.optional(v.string()),
    inputHash: v.optional(v.string()),
    // token accounting if available
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("byUserCreatedAt", ["userId", "createdAt"]) // time-ordered per user
    .index("byUserKindCreatedAt", ["userId", "kind", "createdAt"]) // filter by kind
    .index("byInputHash", ["inputHash"]), // enable idempotency/caching by input

  // Cache of AI search summaries to reduce cost and latency
  aiSummaries: defineTable({
    userId: v.id("users"),
    cacheKey: v.string(), // e.g., hash of query + sorted tag ids
    summary: v.any(), // JSON blob returned by the model
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("byUserCacheKey", ["userId", "cacheKey"]) // upsert by cache key
    .index("byExpiresAt", ["expiresAt"]), // background cleanup
});


