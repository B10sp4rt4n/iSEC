import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqlClient } from "@/lib/db";

const bodySchema = z.object({
  nombre:  z.string().min(2).max(120),
  empresa: z.string().min(2).max(120),
  cargo:   z.string().min(2).max(120),
  correo:  z.string().email().max(180),
});

async function ensureDemoTable(sql: ReturnType<typeof getSqlClient>) {
  await sql`
    CREATE TABLE IF NOT EXISTS demo_prospects (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre     VARCHAR(120) NOT NULL,
      empresa    VARCHAR(120) NOT NULL,
      cargo      VARCHAR(120) NOT NULL,
      correo     VARCHAR(180) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET() {
  const sql = getSqlClient();
  await ensureDemoTable(sql);
  const rows = await sql`
    SELECT id, nombre, empresa, cargo, created_at
    FROM demo_prospects
    ORDER BY created_at DESC
    LIMIT 30
  `;
  return NextResponse.json({ prospects: rows });
}

export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos incompletos.", detail: parsed.error.flatten() }, { status: 400 });
  }

  const sql = getSqlClient();
  await ensureDemoTable(sql);

  const { nombre, empresa, cargo, correo } = parsed.data;
  const [row] = await sql`
    INSERT INTO demo_prospects (nombre, empresa, cargo, correo)
    VALUES (${nombre}, ${empresa}, ${cargo}, ${correo})
    RETURNING id, created_at
  `;

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}
