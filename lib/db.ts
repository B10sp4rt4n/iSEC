import { neon } from "@neondatabase/serverless";

/**
 * Returns a Neon SQL client using the DATABASE_URL environment variable.
 * Throws a descriptive error if the variable is not set.
 */
export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Please add it to your .env.local file or hosting environment."
    );
  }
  return neon(connectionString);
}
