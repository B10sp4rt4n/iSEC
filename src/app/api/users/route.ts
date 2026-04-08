import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSqlClient, ensureUsersSchema } from "@/lib/db";

const userSchema = z.object({
  alias:    z.string().trim().min(2).max(60),
  nombre:   z.string().trim().min(1).max(120),
  apellido: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
});

// GET /api/users — lista todos los usuarios (requiere x-admin-key)
export async function GET(request: Request) {
  const adminKey = process.env.RAFFLE_ADMIN_KEY;
  if (!adminKey || request.headers.get("x-admin-key") !== adminKey) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const sql = getSqlClient();
    await ensureUsersSchema(sql);

    const rows = await sql`
      SELECT user_id, alias, nombre, apellido, created_at
      FROM usuarios
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ users: rows });
  } catch (err) {
    console.error("[GET /api/users]", err);
    return NextResponse.json({ error: "Error al obtener usuarios." }, { status: 500 });
  }
}

// POST /api/users — crea un nuevo usuario con contraseña hasheada
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = userSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { alias, nombre, apellido, password } = parsed.data;
    const password_hash = await bcrypt.hash(password, 12);

    const sql = getSqlClient();
    await ensureUsersSchema(sql);

    const [user] = await sql`
      INSERT INTO usuarios (alias, nombre, apellido, password_hash)
      VALUES (${alias}, ${nombre}, ${apellido}, ${password_hash})
      RETURNING user_id, alias, nombre, apellido, created_at
    `;

    return NextResponse.json({ user }, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("unique") &&
      err.message.includes("alias")
    ) {
      return NextResponse.json({ error: "El alias ya está en uso." }, { status: 409 });
    }
    console.error("[POST /api/users]", err);
    return NextResponse.json({ error: "Error al crear usuario." }, { status: 500 });
  }
}
