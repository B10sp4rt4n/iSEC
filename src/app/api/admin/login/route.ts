import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSqlClient, ensureUsersSchema } from "@/lib/db";

const loginSchema = z.object({
  alias:    z.string().trim().min(1).max(60),
  password: z.string().min(1).max(128),
});

/**
 * POST /api/admin/login
 *
 * Verifica alias + password del equipo interno (tabla usuarios).
 * Si es correcto, devuelve nombre/apellido del agente y el adminToken
 * (RAFFLE_ADMIN_KEY) para que el cliente pueda autenticar las siguientes
 * llamadas sin necesidad de conocer la clave hexadecimal.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    const { alias, password } = parsed.data;

    const adminKey = process.env.RAFFLE_ADMIN_KEY;
    if (!adminKey) {
      return NextResponse.json({ error: "Servidor no configurado." }, { status: 500 });
    }

    const sql = getSqlClient();
    await ensureUsersSchema(sql);

    const [row] = await sql`
      SELECT user_id, alias, nombre, apellido, password_hash
      FROM usuarios
      WHERE alias = ${alias}
    `;

    // Respuesta genérica para no revelar si el alias existe o no
    const invalid = NextResponse.json(
      { error: "Alias o contraseña incorrectos." },
      { status: 401 },
    );

    if (!row) return invalid;

    const match = await bcrypt.compare(password, row.password_hash as string);
    if (!match) return invalid;

    return NextResponse.json({
      ok: true,
      nombre: row.nombre as string,
      apellido: row.apellido as string,
      alias: row.alias as string,
      adminToken: adminKey,
    });
  } catch (err) {
    console.error("[POST /api/admin/login]", err);
    return NextResponse.json({ error: "Error al iniciar sesión." }, { status: 500 });
  }
}
