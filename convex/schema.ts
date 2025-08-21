import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    email: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    encSaltB64: v.optional(v.string()),
    encIterations: v.optional(v.number()),
    wrappedDekB64: v.optional(v.string()),
    wrappedDekIvB64: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byExternalId", ["externalId"]) 
    .index("byEmail", ["email"]),

  tags: defineTable({
    userId: v.id("users"),
    nameEnc: v.object({ ct: v.string(), iv: v.string() }),
    colorEnc: v.object({ ct: v.string(), iv: v.string() }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]),

  notes: defineTable({
    userId: v.id("users"),
    titleEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
    descriptionEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
    contentEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
    tags: v.array(v.id("tags")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]) 
    .index("byUserUpdatedAt", ["userId", "updatedAt"]),

  aiSettings: defineTable({
    userId: v.id("users"),
    provider: v.literal("gemini"),
    enabled: v.boolean(),
    apiKeyEnc: v.optional(v.object({ ct: v.string(), iv: v.string() })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUser", ["userId"]).index("byUserProvider", ["userId", "provider"]),

  aiRequests: defineTable({
    userId: v.id("users"),
    kind: v.union(v.literal("image_to_note"), v.literal("search_summary")),
    provider: v.literal("gemini"),
    model: v.string(),
    status: v.union(v.literal("success"), v.literal("error")),
    error: v.optional(v.string()),
    inputHash: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("byUserCreatedAt", ["userId", "createdAt"]) 
    .index("byUserKindCreatedAt", ["userId", "kind", "createdAt"]) 
    .index("byInputHash", ["inputHash"]),

  aiSummaries: defineTable({
    userId: v.id("users"),
    cacheKey: v.string(),
    summaryEnc: v.object({ ct: v.string(), iv: v.string() }),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("byUserCacheKey", ["userId", "cacheKey"]) 
    .index("byExpiresAt", ["expiresAt"]),

  backups: defineTable({
    userId: v.id("users"),
    kind: v.union(v.literal("manual"), v.literal("auto")),
    status: v.union(v.literal("pending"), v.literal("success"), v.literal("error")),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    bytes: v.optional(v.number()),
    driveFileId: v.optional(v.string()),
    driveWebViewLink: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byUserStartedAt", ["userId", "startedAt"]) 
    .index("byUserFinishedAt", ["userId", "finishedAt"]),
});


