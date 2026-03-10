import { neon } from "@neondatabase/serverless";

export function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta configurada.");
  }

  return neon(databaseUrl);
}
