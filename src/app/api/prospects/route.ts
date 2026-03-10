import { NextResponse } from "next/server";
import { z } from "zod";
import { promises as dns } from "dns";
import { ensureEventSchema, getSqlClient } from "@/lib/db";

const FREE_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "hotmail.com", "hotmail.es", "hotmail.mx",
  "outlook.com", "outlook.es", "outlook.mx",
  "live.com", "live.com.mx", "live.mx",
  "yahoo.com", "yahoo.com.mx", "yahoo.es",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "protonmail.com", "proton.me",
  "tutanota.com", "mail.com", "gmx.com",
  "ymail.com", "msn.com",
]);

const leadSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  empresa: z.string().trim().min(2).max(120),
  cargo: z.string().trim().min(2).max(120),
  correo: z.string().trim().email().max(180),
  telefono: z.string().trim().max(40).optional().or(z.literal("")),
  pregunta_cerrada_1: z.string().trim().min(1).max(80),
  pregunta_cerrada_2: z.string().trim().min(1).max(80),
  dolor_reto: z.string().trim().min(10).max(1000),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = leadSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const domain = parsed.data.correo.split("@")[1].toLowerCase();
    if (FREE_DOMAINS.has(domain)) {
      return NextResponse.json(
        { error: "Por favor usa tu correo empresarial, no uno personal." },
        { status: 422 },
      );
    }
    try {
      const records = await dns.resolveMx(domain);
      if (!records || records.length === 0) throw new Error("sin MX");
    } catch {
      return NextResponse.json(
        { error: "El dominio del correo no parece válido. Usa el correo de tu empresa." },
        { status: 422 },
      );
    }
    }

    const sql = getSqlClient();
    await ensureEventSchema(sql);
    const prospectId = crypto.randomUUID();

    const result = await sql`
      INSERT INTO event_prospects (
        id,
        nombre,
        empresa,
        cargo,
        correo,
        telefono,
        pregunta_cerrada_1,
        pregunta_cerrada_2,
        dolor_reto
      )
      VALUES (
        ${prospectId},
        ${parsed.data.nombre},
        ${parsed.data.empresa},
        ${parsed.data.cargo},
        ${parsed.data.correo},
        ${parsed.data.telefono || null},
        ${parsed.data.pregunta_cerrada_1},
        ${parsed.data.pregunta_cerrada_2},
        ${parsed.data.dolor_reto}
      )
      RETURNING id;
    `;

    const inserted = Array.isArray(result) ? result[0] : null;
    return NextResponse.json({ ok: true, id: inserted?.id ?? null }, { status: 201 });
  } catch (error) {
    console.error("Error al guardar prospecto", error);
    const detail = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: "Error interno al guardar el registro", detail },
      { status: 500 },
    );
  }
}
