import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSqlClient, ensureUsersSchema } from "@/lib/db";

const loginSchema = z.object({
  alias:    z.string().trim().min(1).max(60),
  password: z.string().min(1).max(128),
});

// POST /api/users/login — verifica credenciales y devuelve usuario sin password_hash
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    const { alias, password } = parsed.data;
    const sql = getSqlClient();
    await ensureUsersSchema(sql);

    const [row] = await sql`
      SELECT user_id, alias, nombre, apellido, password_hash, created_at
      FROM usuarios
      WHERE alias = ${alias}
    `;

    // Respuesta genérica para no revelar si el alias existe o no
    const invalid = NextResponse.json(
      { error: "Alias o contraseña incorrectos." },
      { status: 401 }
    );

    if (!row) return invalid;

    const match = await bcrypt.compare(password, row.password_hash as string);
    if (!match) return invalid;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _ph, ...user } = row as Record<string, unknown>;

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[POST /api/users/login]", err);
    return NextResponse.json({ error: "Error al iniciar sesión." }, { status: 500 });
  }
}
