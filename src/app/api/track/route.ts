import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Destinations keyed by campaign. Avoids passing the URL as a query param,
// which causes Netlify's Next.js plugin to append the original query string.
const DESTINATIONS: Record<string, string> = {
  threatdown_cybercrime_webinar_2026_cta:    "https://www.threatdown.com/dl-cybercrime-in-age-of-ai-2026/",
  threatdown_cybercrime_webinar_2026_report: "https://www.threatdown.com/dl-cybercrime-in-age-of-ai-2026/",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaign = (searchParams.get("c") ?? "unknown").slice(0, 120);
  const email = (searchParams.get("email") ?? "").slice(0, 180) || null;
  const to = DESTINATIONS[campaign] ?? "/";

  const response = NextResponse.redirect(to, { status: 302 });

  if (process.env.DATABASE_URL) {
    const sql = neon(process.env.DATABASE_URL);
    sql`INSERT INTO link_clicks (campaign_key, email) VALUES (${campaign}, ${email})`.catch(() => {});
  }

  return response;
}
