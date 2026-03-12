/**
 * GET /cal
 *
 * Redirige al calendario de Calendly preservando los parámetros de nombre y correo.
 * Usar este endpoint en los correos en vez de apuntar directo a calendly.com
 * evita que filtros de spam marquen links externos como sospechosos.
 */
import { NextResponse } from "next/server";

const CALENDLY_BASE =
  "https://calendly.com/salvador-ruiz-synappssys/30min";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? "";
  const name = searchParams.get("name") ?? "";

  const dest = new URL(CALENDLY_BASE);
  if (email) dest.searchParams.set("email", email);
  if (name) dest.searchParams.set("name", name);

  return NextResponse.redirect(dest.toString(), { status: 302 });
}
