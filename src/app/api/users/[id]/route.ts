import { NextResponse } from "next/server";
import { z } from "zod";
import { getSqlClient, ensureUsersSchema } from "@/lib/db";

function isAuthorized(request: Request): boolean {
  const adminKey = process.env.RAFFLE_ADMIN_KEY;
  if (!adminKey) return false;
  return request.headers.get("x-admin-key") === adminKey;
}

const patchSchema = z.object({
  alias:    z.string().trim().min(2).max(60).optional(),
  nombre:   z.string().trim().min(1).max(120).optional(),
  apellido: z.string().trim().min(1).max(120).optional(),
}).refine((d) => Object.keys(d).length > 0, {
  message: "Se requiere al menos un campo para actualizar.",
});

// GET /api/users/[id] — obtiene un usuario por user_id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const sql = getSqlClient();
    await ensureUsersSchema(sql);

    const [user] = await sql`
      SELECT user_id, alias, nombre, apellido, created_at
      FROM usuarios
      WHERE user_id = ${id}
    `;

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[GET /api/users/[id]]", err);
    return NextResponse.json({ error: "Error al obtener usuario." }, { status: 500 });
  }
}

// PATCH /api/users/[id] — actualiza alias, nombre o apellido
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { alias, nombre, apellido } = parsed.data;
    const sql = getSqlClient();
    await ensureUsersSchema(sql);

    const [user] = await sql`
      UPDATE usuarios
      SET
        alias    = COALESCE(${alias ?? null}, alias),
        nombre   = COALESCE(${nombre ?? null}, nombre),
        apellido = COALESCE(${apellido ?? null}, apellido)
      WHERE user_id = ${id}
      RETURNING user_id, alias, nombre, apellido, created_at
    `;

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("unique") &&
      err.message.includes("alias")
    ) {
      return NextResponse.json({ error: "El alias ya está en uso." }, { status: 409 });
    }
    console.error("[PATCH /api/users/[id]]", err);
    return NextResponse.json({ error: "Error al actualizar usuario." }, { status: 500 });
  }
}

// DELETE /api/users/[id] — elimina un usuario por user_id
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const sql = getSqlClient();
    await ensureUsersSchema(sql);

    const [deleted] = await sql`
      DELETE FROM usuarios
      WHERE user_id = ${id}
      RETURNING user_id
    `;

    if (!deleted) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/users/[id]]", err);
    return NextResponse.json({ error: "Error al eliminar usuario." }, { status: 500 });
  }
}
