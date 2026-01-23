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

const toBatch = (items, size) => {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

const run = async () => {
  const inputPath =
    process.argv[2] ||
    path.resolve(process.cwd(), "scripts", "supbase-users.json");
  const raw = await readJson(inputPath);
  if (!Array.isArray(raw)) {
    throw new Error("Supabase users JSON must be an array.");
  }

  const users = raw
    .map((u) => ({
      email: normalizeEmail(u.email),
      name: u.user_metadata?.full_name || u.user_metadata?.name || u.name,
    }))
    .filter((u) => u.email);

  const convexUrl =
    process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || null;
  const adminToken = process.env.MIGRATION_ADMIN_TOKEN || null;
  if (!convexUrl || !adminToken) {
    throw new Error(
      "CONVEX_URL (or VITE_CONVEX_URL) and MIGRATION_ADMIN_TOKEN are required.",
    );
  }

  const client = new ConvexHttpClient(convexUrl);
  const batches = toBatch(users, 50);
  const allResults = [];
  for (const batch of batches) {
    const result = await client.action(api.migrations.createBetterAuthUsers, {
      adminToken,
      users: batch,
    });
    allResults.push(...result.results);
  }

  const createdUsers = allResults
    .filter((r) => r.status === "created" && r.userId)
    .map((r) => ({ id: r.userId, email: r.email }));

  const outputPath = path.resolve(
    process.cwd(),
    "scripts",
    "betterauth-import-results.json",
  );
  await fs.writeFile(outputPath, JSON.stringify(allResults, null, 2), "utf8");
  console.log(`Wrote results to ${outputPath}`);

  const usersPath = path.resolve(
    process.cwd(),
    "scripts",
    "betterauth-users.json",
  );
  await fs.writeFile(
    usersPath,
    JSON.stringify(createdUsers, null, 2),
    "utf8",
  );
  console.log(`Wrote ${createdUsers.length} users to ${usersPath}`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
