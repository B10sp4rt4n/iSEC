import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { getSqlClient } from "@/lib/db";
import { buildLeadframeDemoEmail, LEADFRAME_FROM, sanitizeSubject } from "@/lib/campaigns/leadframe-demo";

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
  await sql`DELETE FROM demo_prospects WHERE created_at < NOW() - INTERVAL '10 minutes'`;
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

  // Rate limit: un email por correo cada 10 minutos
  const [existing] = await sql`
    SELECT id FROM demo_prospects
    WHERE correo = ${correo} AND created_at > NOW() - INTERVAL '10 minutes'
    LIMIT 1
  `;
  const yaRegistrado = Boolean(existing);

  const [row] = await sql`
    INSERT INTO demo_prospects (nombre, empresa, cargo, correo)
    VALUES (${nombre}, ${empresa}, ${cargo}, ${correo})
    RETURNING id, created_at
  `;

  // Enviar email solo si no lo recibió ya en esta ventana
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && !yaRegistrado) {
    const resend = new Resend(resendKey);
    resend.emails.send({
      from: LEADFRAME_FROM,
      to: correo,
      subject: sanitizeSubject(`${nombre}, esto es LeadFrame en acción`),
      html: buildLeadframeDemoEmail(nombre),
    }).catch(() => { /* silent */ });
  }

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}
