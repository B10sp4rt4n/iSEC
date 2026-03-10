import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  // Allow digits, spaces, dashes, parentheses and + prefix
  return /^[+\d][\d\s\-().]{6,19}$/.test(phone);
}

function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  // Trim, enforce max length, and remove angle brackets to prevent HTML injection
  return value.trim().slice(0, 500).replace(/[<>]/g, "");
}

// ---------------------------------------------------------------------------
// POST /api/registro
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
  }

  // --- Extract & sanitize fields ---
  const nombre = sanitize(body.nombre);
  const empresa = sanitize(body.empresa);
  const cargo = sanitize(body.cargo);
  const correo = sanitize(body.correo).toLowerCase();
  const telefono = sanitize(body.telefono);
  const respuesta_cerrada_1 = sanitize(body.respuesta_cerrada_1);
  const respuesta_cerrada_2 = sanitize(body.respuesta_cerrada_2);
  const respuesta_abierta = sanitize(body.respuesta_abierta);
  const evento_id = Number(body.evento_id) || 1;

  // --- Required field validation ---
  const errors: string[] = [];
  if (!nombre) errors.push("El nombre es obligatorio.");
  if (!correo) errors.push("El correo es obligatorio.");
  if (correo && !isValidEmail(correo)) errors.push("El correo no tiene un formato válido.");
  if (telefono && !isValidPhone(telefono)) errors.push("El teléfono no tiene un formato válido.");
  if (!respuesta_cerrada_1) errors.push("La respuesta a la pregunta 1 es obligatoria.");
  if (!respuesta_cerrada_2) errors.push("La respuesta a la pregunta 2 es obligatoria.");
  if (!respuesta_abierta) errors.push("La descripción de tu reto principal es obligatoria.");

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  // --- Persist to Neon ---
  try {
    const sql = getDb();

    const result = await sql`
      INSERT INTO registros
        (evento_id, nombre, empresa, cargo, correo, telefono,
         respuesta_cerrada_1, respuesta_cerrada_2, respuesta_abierta,
         ip_origen, user_agent)
      VALUES
        (${evento_id}, ${nombre}, ${empresa || null}, ${cargo || null}, ${correo},
         ${telefono || null}, ${respuesta_cerrada_1}, ${respuesta_cerrada_2},
         ${respuesta_abierta},
         ${req.headers.get("x-forwarded-for") ?? null},
         ${req.headers.get("user-agent") ?? null})
      RETURNING id, creado_en
    `;

    const registro = result[0];
    return NextResponse.json(
      { success: true, id: registro.id, creado_en: registro.creado_en },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error al guardar registro:", err);
    return NextResponse.json(
      { error: "Error interno del servidor. Intenta de nuevo más tarde." },
      { status: 500 }
    );
  }
}
