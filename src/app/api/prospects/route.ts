import { NextResponse } from "next/server";
import { z } from "zod";
import { promises as dns } from "dns";
import { Resend } from "resend";
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

// Rate limiting en memoria: máximo 5 intentos por IP en 10 minutos
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

const leadSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  empresa: z.string().trim().min(2).max(120),
  cargo: z.enum([
    "ciso", "cio_cto", "director_ops", "director_gral",
    "gerente_ti", "gerente_seguridad", "jefe_ti",
    "admin_sistemas", "ingeniero_seguridad", "analista_ti",
    "reseller", "otro",
  ]),
  correo: z.string().trim().email().max(180),
  telefono: z.string().trim().max(40).optional().or(z.literal("")),
  pregunta_cerrada_1: z.string().trim().min(1).max(80),
  pregunta_cerrada_2: z.string().trim().min(1).max(80),
  dolor_reto: z.string().trim().min(1).max(1000),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." },
      { status: 429 },
    );
  }

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
      RETURNING id, folio;
    `;

    const inserted = Array.isArray(result) ? result[0] : null;
    const folio = inserted?.folio ? String(inserted.folio).padStart(4, "0") : "—";

    // Correo de confirmación (no bloqueante — si falla no afecta el registro)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const fromDomain = process.env.RESEND_FROM ?? "no-reply@registro.synappssys.com";
      resend.emails.send({
        from: `iSEC Infosecurity <${fromDomain}>`,
        to: parsed.data.correo,
        subject: "Gracias por registrarte — iSEC Infosecurity | ThreatDown",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <div style="background:#ffffff;border-radius:8px;padding:8px 16px;
                        display:inline-block;margin-bottom:24px;border:1px solid #e2e8f0">
              <img src="https://registro.synappssys.com/logos/threatdown-logo.png"
                   alt="ThreatDown" style="height:36px;display:block" />
            </div>
            <h2 style="color:#162036;margin:0 0 12px">Hola, ${parsed.data.nombre} 👋</h2>
            <p style="color:#475569;line-height:1.6;margin:0 0 16px">
              Recibimos tu registro correctamente. Un experto de
              <strong>SynAppsSys</strong> se pondrá en contacto contigo
              para darte seguimiento personalizado con <strong>ThreatDown</strong>.
            </p>
            <!-- Sorteo -->
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;
                        padding:16px 20px;margin:20px 0">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1d4ed8">
                🎟️ Ya estás inscrito en el sorteo
              </p>
              <p style="margin:0 0 10px;font-size:13px;color:#1e3a5f;line-height:1.5">
                Con tu registro participas automáticamente en el sorteo del evento
                <strong>iSEC Infosecurity</strong>. Rifamos <strong>4 premios</strong>
                (1°, 2°, 3° y 4° lugar). El ganador se anunciará durante la sesión.
                ¡Buena suerte!
              </p>
              <div style="background:#162036;border-radius:8px;padding:14px 20px;text-align:center">
                <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;
                           letter-spacing:.08em;font-weight:600">Tu folio de participación</p>
                <p style="margin:6px 0 0;font-size:32px;font-weight:800;color:#ffffff;
                           letter-spacing:.1em">#${folio}</p>
              </div>
            </div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="font-size:13px;color:#64748b">
              Si tienes dudas, responde este correo o escríbenos directamente.
            </p>
          </div>
        `,
      }).catch((err: unknown) => console.error("Resend error:", err));
    }

    // Disparo asíncrono del reporte de seguridad (fire & forget — no bloquea la respuesta)
    const scanSecret = process.env.SCAN_REPORT_SECRET;
    const siteUrl = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    if (scanSecret) {
      fetch(`${siteUrl}/api/scan-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": scanSecret,
        },
        body: JSON.stringify({
          nombre: parsed.data.nombre,
          empresa: parsed.data.empresa,
          cargo: parsed.data.cargo,
          correo: parsed.data.correo,
          dolor_reto: parsed.data.dolor_reto,
        }),
      }).catch((err: unknown) => console.error("[prospects] scan-report fire error:", err));
    }

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
