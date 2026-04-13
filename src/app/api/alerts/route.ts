import { NextResponse } from "next/server";
import { getSqlClient, ensureEventSchema } from "@/lib/db";

// GET /api/alerts — todas las alertas pendientes con datos del prospecto
export async function GET(request: Request) {
  const adminKey = process.env.RAFFLE_ADMIN_KEY;
  if (!adminKey || request.headers.get("x-admin-key") !== adminKey) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const sql = getSqlClient();
    await ensureEventSchema(sql);

    const rows = await sql`
      SELECT
        a.id,
        a.prospect_id,
        a.scheduled_at,
        a.titulo,
        a.nota,
        a.completado,
        a.created_by,
        a.created_at,
        p.nombre  AS prospect_nombre,
        p.empresa AS prospect_empresa,
        p.telefono AS prospect_telefono,
        p.correo  AS prospect_correo
      FROM prospect_alerts a
      JOIN event_prospects p ON p.id = a.prospect_id
      WHERE a.completado = FALSE
      ORDER BY a.scheduled_at ASC
    `;

    return NextResponse.json({ ok: true, alerts: rows }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[GET /api/alerts]", err);
    return NextResponse.json({ error: "Error al obtener alertas." }, { status: 500 });
  }
}
