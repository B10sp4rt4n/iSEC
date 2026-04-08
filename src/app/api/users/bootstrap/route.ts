import { NextResponse } from "next/server";
import { getSqlClient, ensureUsersSchema } from "@/lib/db";

/**
 * GET /api/users/bootstrap
 *
 * Endpoint público (sin auth) que indica si ya existe al menos un usuario
 * en la tabla. Se usa para el flujo de arranque en /admin/usuarios:
 * si no hay usuarios, mostrar el formulario de creación sin requerir login.
 */
export async function GET() {
  try {
    const sql = getSqlClient();
    await ensureUsersSchema(sql);

    const [row] = await sql`SELECT COUNT(*)::int AS total FROM usuarios`;
    const hasUsers = (row?.total as number) > 0;

    return NextResponse.json({ hasUsers }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[GET /api/users/bootstrap]", err);
    // En caso de error asumimos que hay usuarios (más seguro)
    return NextResponse.json({ hasUsers: true });
  }
}
