import { NextResponse } from "next/server";
import { promises as dns } from "dns";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ valid: false, reason: "Formato de correo inválido." });
  }

  const domain = email.split("@")[1];

  if (FREE_DOMAINS.has(domain)) {
    return NextResponse.json({
      valid: false,
      reason: "Por favor usa tu correo empresarial, no uno personal.",
    });
  }

  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) {
      return NextResponse.json({
        valid: false,
        reason: "El dominio de tu correo no parece válido. Verifica que sea el correo de tu empresa.",
      });
    }
    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({
      valid: false,
      reason: "No se pudo verificar el dominio de tu correo. Usa el correo de tu empresa.",
    });
  }
}
