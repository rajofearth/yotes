import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const run = async () => {
  const convexUrl =
    process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || null;
  const adminToken = process.env.MIGRATION_ADMIN_TOKEN || null;

  if (!convexUrl || !adminToken) {
    throw new Error(
      "CONVEX_URL (or VITE_CONVEX_URL) and MIGRATION_ADMIN_TOKEN are required.",
    );
  }

  const client = new ConvexHttpClient(convexUrl);
  const users = await client.query(api.users.listAllUsersForMigration, {
    adminToken,
  });

  const outputPath = path.resolve(process.cwd(), "scripts", "convex-users.json");
  await fs.writeFile(outputPath, JSON.stringify(users, null, 2), "utf8");
  console.log(`Wrote ${users.length} users to ${outputPath}`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
