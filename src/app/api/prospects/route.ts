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
    "reseller", "reseller_ventas", "reseller_preventa", "reseller_gerente",
    "vendor_am", "vendor_se", "vendor_channel", "vendor_mktg",
    "otro",
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
      const fromDomain = process.env.RESEND_FROM ?? "analisis@send.synappssys.com";
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

            <!-- Recursos del fabricante -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
                        padding:16px 20px;margin:0 0 24px">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#162036;
                        text-transform:uppercase;letter-spacing:.06em">
                📚 Recursos de ThreatDown
              </p>
              <table cellpadding="0" cellspacing="0" style="width:100%">
                <!-- Sitio web -->
                <tr>
                  <td colspan="2" style="padding:4px 0;font-size:12px;color:#64748b;
                      font-weight:600;text-transform:uppercase;letter-spacing:.05em;
                      padding-top:8px">Sitio web</td>
                </tr>
                <tr>
                  <td style="padding:3px 8px 3px 0;font-size:13px">
                    <a href="https://www.threatdown.com/"
                       style="color:#1d4ed8;text-decoration:none">
                      ¿Qué es ThreatDown?
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:3px 8px 3px 0;font-size:13px">
                    <a href="https://www.threatdown.com/products-bundles/"
                       style="color:#1d4ed8;text-decoration:none">
                      Bundles y productos
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:3px 8px 3px 0;font-size:13px">
                    <a href="https://www.threatdown.com/why-threatdown/"
                       style="color:#1d4ed8;text-decoration:none">
                      ¿Por qué ThreatDown?
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:3px 8px 3px 0;font-size:13px">
                    <a href="https://www.threatdown.com/resources/"
                       style="color:#1d4ed8;text-decoration:none">
                      Recursos y datasheets
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:3px 8px 3px 0;font-size:13px">
                    <a href="https://www.malwarebytes.com/blog/"
                       style="color:#1d4ed8;text-decoration:none">
                      Blog de ciberseguridad
                    </a>
                  </td>
                </tr>
                <!-- Datasheets -->
                <tr>
                  <td colspan="2" style="padding:4px 0;font-size:12px;color:#64748b;
                      font-weight:600;text-transform:uppercase;letter-spacing:.05em;
                      padding-top:12px">Datasheets</td>
                </tr>
                <tr>
                  <td style="padding:3px 8px 3px 0;font-size:13px">
                    <a href="https://www.threatdown.com/wp-content/uploads/2024/04/TD_EDR_Datasheet_v2.pdf"
                       style="color:#1d4ed8;text-decoration:none">
                      📄 ThreatDown EDR
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:3px 8px 3px 0;font-size:13px">
                    <a href="https://www.threatdown.com/wp-content/uploads/2025/07/TD_Email_Security_Datasheet.pdf"
                       style="color:#1d4ed8;text-decoration:none">
                      📄 ThreatDown Email Security
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:3px 8px 3px 0;font-size:13px">
                    <a href="https://www.threatdown.com/wp-content/uploads/2025/11/TD_MDR_Datasheet.pdf"
                       style="color:#1d4ed8;text-decoration:none">
                      📄 ThreatDown MDR
                    </a>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Firma Estela Cota -->
            <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#1e293b;margin-bottom:24px">
              <tr>
                <td style="padding-right:16px;vertical-align:top">
                  <img src="https://registro.synappssys.com/logos/threatdown-logo.png"
                       alt="ThreatDown" style="height:28px;display:block;margin-bottom:6px"/>
                </td>
                <td style="border-left:3px solid #162036;padding-left:16px;vertical-align:top">
                  <p style="margin:0;font-weight:700;color:#162036">Estela Cota</p>
                  <p style="margin:2px 0 0;color:#475569">Territory Channel Account Manager, LATAM</p>
                  <p style="margin:6px 0 0;color:#64748b">
                    e: <a href="mailto:ecota@malwarebytes.com"
                         style="color:#162036;text-decoration:none">ecota@malwarebytes.com</a>
                  </p>
                  <p style="margin:2px 0 0;color:#64748b">
                    m: <a href="tel:+16198699089"
                         style="color:#162036;text-decoration:none">+1 619 869 9089</a>
                  </p>
                  <p style="margin:2px 0 0;color:#94a3b8;font-size:11px">
                    3979 Freedom Circle, 12th Floor, Santa Clara, CA 95054
                  </p>
                </td>
              </tr>
            </table>

            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px"/>

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
