import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { getSqlClient, ensureEventSchema } from "@/lib/db";

const CARGO_LABEL: Record<string, string> = {
  ciso: "CISO",
  cio_cto: "CIO / CTO",
  director_ops: "Director de Operaciones",
  director_gral: "Director General",
  gerente_ti: "Gerente de TI",
  gerente_seguridad: "Gerente de Seguridad",
  jefe_ti: "Jefe de TI",
  admin_sistemas: "Administrador de Sistemas",
  ingeniero_seguridad: "Ingeniero de Seguridad",
  analista_ti: "Analista de TI",
  reseller: "Consultor / Integrador Técnico",
  reseller_ventas: "Ejecutivo de Ventas (Canal)",
  reseller_preventa: "Preventa / Sales Engineer (Canal)",
  reseller_gerente: "Gerente de Canal / Partner Manager",
  vendor_am: "Account Manager (Vendor)",
  vendor_se: "Sales Engineer (Vendor)",
  vendor_channel: "Channel Manager (Fabricante)",
  vendor_mktg: "Marketing / Desarrollo de Negocio (Vendor)",
  otro: "Otro",
};

const RIESGO_LABEL: Record<string, string> = {
  ransomware: "Ransomware",
  phishing: "Phishing / correo malicioso",
  visibilidad: "Falta de visibilidad sobre equipos",
  navegacion: "Navegación a sitios riesgosos",
};

const DETECCION_LABEL: Record<string, string> = {
  no: "No tiene capacidad de detección",
  no_seguro: "No está seguro",
  si: "Sí tiene capacidad",
};

function isAuthorized(request: Request): boolean {
  const adminKey = process.env.RAFFLE_ADMIN_KEY;
  if (!adminKey) return false;
  return request.headers.get("x-admin-key") === adminKey;
}

// ─── GET /api/prospects/[id]/notes ─────────────────────────────────────────
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
      SELECT id, autor, contenido, created_at
      FROM prospect_notes
      WHERE prospect_id = ${id}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({ ok: true, notes: rows }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[GET /api/prospects/[id]/notes]", err);
    return NextResponse.json({ error: "Error al obtener notas." }, { status: 500 });
  }
}

// ─── POST /api/prospects/[id]/notes ────────────────────────────────────────
const manualNoteSchema = z.object({
  contenido: z.string().trim().min(1).max(4000),
  autor: z.string().trim().max(120).optional(),
});

const aiNoteSchema = z.object({
  generar_ia: z.literal(true),
});

export async function POST(
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

    const body = await request.json();

    // ── Rama IA ──────────────────────────────────────────────────────────
    const aiParsed = aiNoteSchema.safeParse(body);
    if (aiParsed.success) {
      // Obtener datos del prospecto
      const [prospect] = await sql`
        SELECT nombre, empresa, cargo, pregunta_cerrada_1, pregunta_cerrada_2, dolor_reto
        FROM event_prospects
        WHERE id = ${id}
      `;

      if (!prospect) {
        return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
      }

      // Obtener notas existentes para dar contexto a la IA
      const existingNotes = await sql`
        SELECT autor, contenido, created_at
        FROM prospect_notes
        WHERE prospect_id = ${id}
        ORDER BY created_at ASC
      `;

      const notesContext = existingNotes.length > 0
        ? existingNotes
            .map((n) => `[${n.autor}] ${n.contenido}`)
            .join("\n")
        : "Sin notas previas.";

      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return NextResponse.json({ error: "OpenAI no configurado." }, { status: 500 });
      }

      const openai = new OpenAI({ apiKey: openaiKey });
      const cargoLabel = CARGO_LABEL[prospect.cargo as string] ?? prospect.cargo;
      const riesgoLabel = RIESGO_LABEL[prospect.pregunta_cerrada_1 as string] ?? prospect.pregunta_cerrada_1;
      const detLabel = DETECCION_LABEL[prospect.pregunta_cerrada_2 as string] ?? prospect.pregunta_cerrada_2;

      let aiContent = "";
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 300,
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                "Eres un agente de ventas B2B especialista en ciberseguridad para SynAppsSys, distribuidor de ThreatDown. " +
                "Tu misión es generar sugerencias breves y accionables para el equipo de ventas sobre cómo avanzar con un prospecto. " +
                "Escribes en español, en primera persona del plural (nosotros), directo y orientado a la acción. " +
                "Máximo 4 oraciones. No repitas lo que ya está en las notas — agrega valor nuevo.",
            },
            {
              role: "user",
              content:
                `Perfil del prospecto:\n` +
                `- Nombre: ${prospect.nombre}\n` +
                `- Empresa: ${prospect.empresa}\n` +
                `- Cargo: ${cargoLabel}\n` +
                `- Riesgo principal declarado: ${riesgoLabel}\n` +
                `- Capacidad de detección interna: ${detLabel}\n` +
                `- Reto / dolor: ${prospect.dolor_reto}\n\n` +
                `Historial de notas del equipo:\n${notesContext}\n\n` +
                "Genera una sugerencia de seguimiento accionable para el agente de ventas. " +
                "Incluye: cuál sería el mejor siguiente paso, qué objeción podría surgir y cómo manejarla, " +
                "y qué material de ThreatDown sería más relevante compartir.",
            },
          ],
        });
        aiContent = completion.choices[0]?.message?.content?.trim() ?? "Sin sugerencia generada.";
      } catch (err) {
        console.error("[notes AI generation]", err);
        aiContent = "No se pudo generar sugerencia. Intenta de nuevo.";
      }

      const [savedNote] = await sql`
        INSERT INTO prospect_notes (prospect_id, autor, contenido)
        VALUES (${id}, 'ia', ${aiContent})
        RETURNING id, autor, contenido, created_at
      `;

      return NextResponse.json({ ok: true, note: savedNote }, { status: 201 });
    }

    // ── Rama manual ──────────────────────────────────────────────────────
    const manualParsed = manualNoteSchema.safeParse(body);
    if (!manualParsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos.", details: manualParsed.error.flatten() },
        { status: 400 },
      );
    }

    const { contenido, autor = "usuario" } = manualParsed.data;

    const [savedNote] = await sql`
      INSERT INTO prospect_notes (prospect_id, autor, contenido)
      VALUES (${id}, ${autor}, ${contenido})
      RETURNING id, autor, contenido, created_at
    `;

    return NextResponse.json({ ok: true, note: savedNote }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/prospects/[id]/notes]", err);
    return NextResponse.json({ error: "Error al guardar nota." }, { status: 500 });
  }
}
