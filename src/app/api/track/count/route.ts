import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// GET /api/track/count?c=threatdown_cybercrime_webinar_2026_cta
// Returns { campaign_key, clicks, first_click, last_click }
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.RAFFLE_ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campaign = searchParams.get("c");

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  const sql = neon(process.env.DATABASE_URL);

  if (campaign) {
    const [row] = await sql`
      SELECT
        campaign_key,
        COUNT(*)::int AS clicks,
        MIN(clicked_at) AS first_click,
        MAX(clicked_at) AS last_click
      FROM link_clicks
      WHERE campaign_key = ${campaign}
      GROUP BY campaign_key
    `;
    return NextResponse.json(row ?? { campaign_key: campaign, clicks: 0 });
  }

  const rows = await sql`
    SELECT
      campaign_key,
      COUNT(*)::int AS clicks,
      MIN(clicked_at) AS first_click,
      MAX(clicked_at) AS last_click
    FROM link_clicks
    GROUP BY campaign_key
    ORDER BY clicks DESC
  `;
  return NextResponse.json(rows);
}
