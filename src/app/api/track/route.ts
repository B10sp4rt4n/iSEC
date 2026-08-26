import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaign = (searchParams.get("c") ?? "unknown").slice(0, 120);
  const to = searchParams.get("to") ?? "/";

  // Redirect immediately; track in background
  const response = NextResponse.redirect(to, { status: 302 });

  if (process.env.DATABASE_URL) {
    const sql = neon(process.env.DATABASE_URL);
    sql`INSERT INTO link_clicks (campaign_key) VALUES (${campaign})`.catch(() => {});
  }

  return response;
}
