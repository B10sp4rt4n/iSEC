import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqlClient, ensureEventSchema } from "@/lib/db";

function isAuthorized(request: Request): boolean {
  const adminKey = process.env.RAFFLE_ADMIN_KEY;
  if (!adminKey) return false;
  return request.headers.get("x-admin-key") === adminKey;
}

// ─── GET /api/prospects/[id]/alerts ────────────────────────────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const sql = getSqlClient();
    await ensureEventSchema(sql);

    const rows = await sql`
      SELECT id, prospect_id, scheduled_at, titulo, nota, completado, created_by, created_at
      FROM prospect_alerts
      WHERE prospect_id = ${id}
      ORDER BY scheduled_at ASC
    `;

    return NextResponse.json({ ok: true, alerts: rows }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[GET /api/prospects/[id]/alerts]", err);
    return NextResponse.json({ error: "Error al obtener alertas." }, { status: 500 });
  }
}

// ─── POST /api/prospects/[id]/alerts ───────────────────────────────────────
const alertSchema = z.object({
  scheduled_at: z.string().datetime(),
  titulo: z.string().trim().min(1).max(200).default("Llamada de seguimiento"),
  nota: z.string().trim().max(1000).default(""),
  created_by: z.string().trim().min(1).max(120),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = alertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos.", details: parsed.error.flatten() }, { status: 422 });
  }

  const { scheduled_at, titulo, nota, created_by } = parsed.data;

  try {
    const sql = getSqlClient();
    await ensureEventSchema(sql);

    const [alert] = await sql`
      INSERT INTO prospect_alerts (prospect_id, scheduled_at, titulo, nota, created_by)
      VALUES (${id}, ${scheduled_at}, ${titulo}, ${nota}, ${created_by})
      RETURNING id, prospect_id, scheduled_at, titulo, nota, completado, created_by, created_at
    `;

    return NextResponse.json({ ok: true, alert }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/prospects/[id]/alerts]", err);
    return NextResponse.json({ error: "Error al crear alerta." }, { status: 500 });
  }
}

// ─── PATCH /api/prospects/[id]/alerts — toggle completado ──────────────────
const patchSchema = z.object({
  alertId: z.string().uuid(),
  completado: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
  }

  const { alertId, completado } = parsed.data;

  try {
    const sql = getSqlClient();

    const [alert] = await sql`
      UPDATE prospect_alerts
      SET completado = ${completado}
      WHERE id = ${alertId} AND prospect_id = ${id}
      RETURNING id, prospect_id, scheduled_at, titulo, nota, completado, created_by, created_at
    `;

    if (!alert) {
      return NextResponse.json({ error: "Alerta no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, alert });
  } catch (err) {
    console.error("[PATCH /api/prospects/[id]/alerts]", err);
    return NextResponse.json({ error: "Error al actualizar alerta." }, { status: 500 });
  }
}
