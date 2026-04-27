/**
 * POST /api/campaign
 *
 * Envía el Email 1 de la secuencia de seguimiento post-evento.
 * Adjunta el reporte 2026 State of Malware (ThreatDown).
 *
 * Modos:
 *   { test: true }              → envía a salvador.ruiz@synappssys.com
 *   { prospect_id: string }     → envía a un prospecto específico
 *   { broadcast: true }         → envía a todos los prospectos (sin canal)
 *
 * Requiere header: x-admin-key
 */

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { Resend } from "resend";
import { getSqlClient, ensureEventSchema } from "@/lib/db";

// ─── Validación ─────────────────────────────────────────────────────────────
const bodySchema = z.union([
  z.object({ test: z.literal(true) }),
  z.object({ prospect_id: z.string().uuid() }),
  z.object({ broadcast: z.literal(true) }),
]);

const CALENDLY = "https://calendly.com/salvador-ruiz-synappssys";
const FROM_NAME = "iSEC Infosecurity";
const SUBJECT = "El 86% del ransomware ya se ejecuta de forma remota";

// Perfiles de canal — no reciben esta campaña
const CHANNEL_CARGOS = new Set([
  "reseller", "reseller_ventas", "reseller_preventa", "reseller_gerente",
  "vendor_am", "vendor_se", "vendor_channel", "vendor_mktg",
]);

// ─── HTML del correo ─────────────────────────────────────────────────────────
function buildCampaignHtml(nombre: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;
                    box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:96vw">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:28px 36px">
            <div style="margin-bottom:18px">
              <span style="display:inline-block;background:#162036;border:1px solid #1e3a5f;
                           border-radius:6px;padding:6px 14px;
                           font-size:12px;font-weight:700;color:#38bdf8;
                           letter-spacing:0.08em;text-transform:uppercase">
                iSEC Infosecurity × ThreatDown
              </span>
            </div>
            <h1 style="margin:0;color:#f8fafc;font-size:22px;font-weight:700;line-height:1.35">
              El 86% del ransomware ya se ejecuta de forma remota
            </h1>
          </td>
        </tr>

        <!-- Cuerpo -->
        <tr>
          <td style="padding:36px 36px 0">
            <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7">
              Hola, <strong>${nombre}</strong>:
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7">
              Un dato del reporte <strong>2026 State of Malware</strong> llamó especialmente la atención:
            </p>

            <!-- Stat destacado -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td style="background:#0f172a;border-left:4px solid #0ea5e9;border-radius:0 8px 8px 0;
                           padding:18px 24px">
                  <p style="margin:0;font-size:26px;font-weight:800;color:#38bdf8;line-height:1">86%</p>
                  <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;line-height:1.5">
                    del cifrado por ransomware en 2025 fue ejecutado de forma remota
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7">
              Esto significa que muchos ataques ya no dependen únicamente de malware tradicional,
              sino del uso de <strong>herramientas legítimas</strong>, credenciales comprometidas
              y movimiento lateral dentro de la red.
            </p>
            <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.7;font-weight:600">
              Por eso, la pregunta clave ya no es solo si la organización tiene antivirus o protección básica, sino:
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#0f172a;line-height:1.7;
                      background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 20px;
                      border-radius:0 8px 8px 0;font-style:italic">
              ¿El EDR actual puede detectar y contener este comportamiento antes de que avance el cifrado?
            </p>

            <p style="margin:0 0 10px;font-size:14px;color:#64748b;line-height:1.6">
              El reporte identifica patrones que ponen a prueba la cobertura real del EDR:
            </p>

            <!-- Lista de patrones -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr><td style="padding:4px 0 4px 0">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;vertical-align:top;padding-top:3px">
                      <span style="color:#ef4444;font-size:12px">■</span>
                    </td>
                    <td style="font-size:14px;color:#334155;line-height:1.6;padding-left:6px">
                      Ataques fuera de horario laboral
                    </td>
                  </tr>
                </table>
              </td></tr>
              <tr><td style="padding:4px 0">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;vertical-align:top;padding-top:3px">
                      <span style="color:#ef4444;font-size:12px">■</span>
                    </td>
                    <td style="font-size:14px;color:#334155;line-height:1.6;padding-left:6px">
                      Uso malicioso de herramientas legítimas (LOLBins)
                    </td>
                  </tr>
                </table>
              </td></tr>
              <tr><td style="padding:4px 0">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;vertical-align:top;padding-top:3px">
                      <span style="color:#ef4444;font-size:12px">■</span>
                    </td>
                    <td style="font-size:14px;color:#334155;line-height:1.6;padding-left:6px">
                      Movimiento lateral dentro de la red
                    </td>
                  </tr>
                </table>
              </td></tr>
              <tr><td style="padding:4px 0">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;vertical-align:top;padding-top:3px">
                      <span style="color:#ef4444;font-size:12px">■</span>
                    </td>
                    <td style="font-size:14px;color:#334155;line-height:1.6;padding-left:6px">
                      Actividad sospechosa desde endpoints o servidores internos
                    </td>
                  </tr>
                </table>
              </td></tr>
              <tr><td style="padding:4px 0">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:20px;vertical-align:top;padding-top:3px">
                      <span style="color:#ef4444;font-size:12px">■</span>
                    </td>
                    <td style="font-size:14px;color:#334155;line-height:1.6;padding-left:6px">
                      Cifrado iniciado desde equipos no administrados o con baja visibilidad
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <p style="margin:0 0 28px;font-size:15px;color:#334155;line-height:1.7">
              Con gusto te comparto el reporte completo (adjunto a este correo).
              Así también te propongo agendar <strong>30 minutos</strong> para revisar
              cómo tu EDR debería responder ante estos escenarios.
            </p>

            <p style="margin:0 0 28px;font-size:15px;color:#334155;line-height:1.7;font-weight:600">
              ¿Tienes algún espacio esta semana?
            </p>

            <!-- CTA Calendly -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:36px">
              <tr>
                <td style="background:#0ea5e9;border-radius:8px;padding:0">
                  <a href="${CALENDLY}"
                     style="display:inline-block;padding:14px 32px;
                            font-size:15px;font-weight:700;color:#ffffff;
                            text-decoration:none;border-radius:8px;
                            background:#0ea5e9">
                    Agendar 30 minutos →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Firma -->
        <tr>
          <td style="padding:0 36px 36px">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-top:1px solid #e2e8f0;padding-top:24px">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a">
                    Salvador Ruiz
                  </p>
                  <p style="margin:0 0 2px;font-size:13px;color:#64748b">
                    iSEC Infosecurity — Partner ThreatDown by Malwarebytes
                  </p>
                  <p style="margin:0;font-size:12px;color:#94a3b8">
                    📎 Reporte adjunto: 2026 State of Malware — ThreatDown
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6">
              Recibiste este correo porque te registraste en un evento de iSEC Infosecurity.
              Si no deseas recibir más comunicaciones, responde a este correo con el asunto
              <em>"No contactar"</em>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
function isAuthorized(request: Request): boolean {
  const key = process.env.RAFFLE_ADMIN_KEY;
  return !!key && request.headers.get("x-admin-key") === key;
}

type ProspectRow = { id: string; nombre: string; correo: string; cargo: string };

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY no configurado." }, { status: 500 });
  }

  const fromDomain = process.env.RESEND_FROM ?? "no-reply@send.synappssys.com";
  const resend = new Resend(resendKey);

  // Leer PDF una sola vez
  let pdfContent: Buffer;
  try {
    pdfContent = readFileSync(join(process.cwd(), "public", "2026_ThreatDown_State_of_Malware.pdf"));
  } catch {
    return NextResponse.json({ error: "No se encontró el PDF adjunto." }, { status: 500 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos.", detail: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;

  // ── Modo test ──────────────────────────────────────────────────────────────
  if ("test" in body) {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${fromDomain}>`,
      to: "salvador.ruiz@synappssys.com",
      subject: `[TEST] ${SUBJECT}`,
      html: buildCampaignHtml("Salvador"),
      attachments: [
        {
          filename: "2026_ThreatDown_State_of_Malware.pdf",
          content: pdfContent,
        },
      ],
    });

    if (error) {
      console.error("[campaign] test send error:", error);
      return NextResponse.json({ error: "Error al enviar correo de prueba.", detail: error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode: "test", sent_to: "salvador.ruiz@synappssys.com" });
  }

  const sql = getSqlClient();
  await ensureEventSchema(sql);

  // ── Modo prospecto individual ──────────────────────────────────────────────
  if ("prospect_id" in body) {
    const rows = (await sql`
      SELECT id, nombre, correo, cargo
      FROM event_prospects
      WHERE id = ${body.prospect_id}
    `) as ProspectRow[];
    const p = rows[0];
    if (!p) {
      return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
    }

    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${fromDomain}>`,
      to: p.correo,
      subject: SUBJECT,
      html: buildCampaignHtml(p.nombre),
      attachments: [
        {
          filename: "2026_ThreatDown_State_of_Malware.pdf",
          content: pdfContent,
        },
      ],
    });

    if (error) {
      console.error("[campaign] send error:", error);
      return NextResponse.json({ error: "Error al enviar correo.", detail: error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode: "single", sent_to: p.correo });
  }

  // ── Modo broadcast ────────────────────────────────────────────────────────
  const allProspects = (await sql`
    SELECT id, nombre, correo, cargo
    FROM event_prospects
    ORDER BY created_at ASC
  `) as ProspectRow[];

  // Excluir canal y correos corporativos vacíos
  const targets = allProspects.filter(
    (p) => !CHANNEL_CARGOS.has(p.cargo) && p.correo.includes("@"),
  );

  const results: { correo: string; ok: boolean; error?: string }[] = [];

  for (const p of targets) {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${fromDomain}>`,
      to: p.correo,
      subject: SUBJECT,
      html: buildCampaignHtml(p.nombre),
      attachments: [
        {
          filename: "2026_ThreatDown_State_of_Malware.pdf",
          content: pdfContent,
        },
      ],
    });

    results.push({ correo: p.correo, ok: !error, error: error?.message });

    // Resend rate limit: 2 req/s en plan gratuito
    await new Promise((r) => setTimeout(r, 600));
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({ ok: true, mode: "broadcast", sent, failed, results });
}
