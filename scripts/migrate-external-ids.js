import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const readJson = async (filePath) => {
  const data = await fs.readFile(filePath, "utf8");
  return JSON.parse(data);
};

const normalizeEmail = (value) => value?.trim().toLowerCase() ?? "";

const buildMappings = (supabaseUsers, betterAuthUsers) => {
  const supabaseByEmail = new Map();
  for (const user of supabaseUsers) {
    const email = normalizeEmail(user.email);
    if (!email) continue;
    supabaseByEmail.set(email, user);
  }

  const mappings = [];
  for (const user of betterAuthUsers) {
    const email = normalizeEmail(user.email);
    if (!email) continue;
    const supa = supabaseByEmail.get(email);
    if (!supa?.id || !user.id) continue;
    if (supa.id === user.id) continue;
    mappings.push({ oldExternalId: supa.id, newExternalId: user.id });
  }
  return mappings;
};

const writeMappings = async (filePath, mappings) => {
  const json = JSON.stringify(mappings, null, 2);
  await fs.writeFile(filePath, json, "utf8");
};

const run = async () => {
  const supabasePath = process.argv[2];
  const betterAuthPath = process.argv[3];
  if (!supabasePath || !betterAuthPath) {
    throw new Error(
      "Usage: node scripts/migrate-external-ids.js supabase-users.json better-auth-users.json",
    );
  }

  const supabaseUsers = await readJson(supabasePath);
  const betterAuthUsers = await readJson(betterAuthPath);
  if (!Array.isArray(supabaseUsers) || !Array.isArray(betterAuthUsers)) {
    throw new Error("Both JSON files must be arrays of users.");
  }

  const mappings = buildMappings(supabaseUsers, betterAuthUsers);
  const outputPath = path.resolve(process.cwd(), "external-id-mappings.json");
  await writeMappings(outputPath, mappings);

  const convexUrl =
    process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || null;
  const adminToken = process.env.MIGRATION_ADMIN_TOKEN || null;
  const shouldApply = process.env.APPLY_MIGRATION === "true";

  if (!shouldApply) {
    console.log(
      `Wrote ${mappings.length} mappings to ${outputPath}. Set APPLY_MIGRATION=true to apply.`,
    );
    return;
  }

  if (!convexUrl || !adminToken) {
    throw new Error(
      "CONVEX_URL (or VITE_CONVEX_URL) and MIGRATION_ADMIN_TOKEN are required to apply.",
    );
  }

  const client = new ConvexHttpClient(convexUrl);
  const result = await client.mutation(api.users.migrateExternalIds, {
    adminToken,
    mappings,
  });
  console.log("Migration result:", result);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
