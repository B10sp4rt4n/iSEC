/**
 * POST /api/campaign2
 *
 * Envía el Email 2 de la secuencia de seguimiento post-evento.
 * Sin adjunto — seguimiento ejecutivo, CTA a Calendly.
 *
 * Modos:
 *   { test: true }              → envía a salvador.ruiz@synappssys.com
 *   { prospect_id: string }     → envía a un prospecto específico
 *   { broadcast: true }         → envía a todos los prospectos (sin canal)
 *
 * Requiere header: x-admin-key
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { getSqlClient, ensureEventSchema, lookupKnownError } from "@/lib/db";

// ─── Validación ──────────────────────────────────────────────────────────────
const bodySchema = z.union([
  z.object({ test: z.literal(true) }),
  z.object({ prospect_id: z.string().uuid() }),
  z.object({ broadcast: z.literal(true) }),
]);

const CALENDLY   = "https://calendly.com/salvador-ruiz-synappssys";
const FROM_NAME  = "iSEC Infosecurity";
const SUBJECT    = "Tu EDR, ¿detectaría los 5 patrones del reporte?";
const VALIDATOR_EMAIL = "salvador.ruiz@synappssys.com";
const OWNER_EMAIL     = "salvador.ruiz@synappssys.com";
const REPORT_RECIPIENTS = ["salvador.ruiz@synappssys.com"];
const EXCLUDE_EMAILS = new Set(["blanca.pech@netpay.com.mx"]);

const CHANNEL_CARGOS = new Set([
  "reseller", "reseller_ventas", "reseller_preventa", "reseller_gerente",
  "vendor_am", "vendor_se", "vendor_channel", "vendor_mktg",
]);

// ─── HTML ────────────────────────────────────────────────────────────────────
function buildEmail2Html(nombre: string): string {
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
              Tu EDR, ¿detectaría los 5 patrones del reporte?
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
              El dato que más llamó la atención del <strong>2026 State of Malware</strong>
              no fue el volumen de ataques — fue el método.
            </p>

            <!-- Stat destacado -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td style="background:#0f172a;border-left:4px solid #0ea5e9;border-radius:0 8px 8px 0;
                           padding:18px 24px">
                  <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6">
                    El <span style="font-size:26px;font-weight:800;color:#38bdf8">86%</span>
                    del cifrado por ransomware en 2025 se ejecutó de forma remota,
                    usando <strong style="color:#e2e8f0">credenciales válidas, herramientas
                    legítimas y equipos internos</strong>.<br>
                    No malware nuevo. No exploits de día cero.
                    Infraestructura propia de la organización, operada por el atacante.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.7">
              Lo que eso implica operativamente es concreto:
            </p>

            <!-- Tres puntos -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr><td style="padding:8px 0">
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="width:4px;background:#0ea5e9;border-radius:2px;vertical-align:top">&nbsp;</td>
                    <td style="padding:0 0 0 16px">
                      <p style="margin:0;font-size:14px;color:#0f172a;font-weight:700;line-height:1.4">
                        Visibilidad real
                      </p>
                      <p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.6">
                        ¿El EDR cubre endpoints, servidores y equipos no administrados,
                        o hay zonas ciegas?
                      </p>
                    </td>
                  </tr>
                </table>
              </td></tr>
              <tr><td style="padding:8px 0">
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="width:4px;background:#f59e0b;border-radius:2px;vertical-align:top">&nbsp;</td>
                    <td style="padding:0 0 0 16px">
                      <p style="margin:0;font-size:14px;color:#0f172a;font-weight:700;line-height:1.4">
                        Detección de comportamiento
                      </p>
                      <p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.6">
                        ¿Distingue entre un usuario legítimo usando RDP y un atacante
                        haciendo lo mismo?
                      </p>
                    </td>
                  </tr>
                </table>
              </td></tr>
              <tr><td style="padding:8px 0">
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="width:4px;background:#ef4444;border-radius:2px;vertical-align:top">&nbsp;</td>
                    <td style="padding:0 0 0 16px">
                      <p style="margin:0;font-size:14px;color:#0f172a;font-weight:700;line-height:1.4">
                        Velocidad de contención
                      </p>
                      <p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.6">
                        ¿En cuánto tiempo puede aislar un equipo comprometido antes de
                        que el cifrado avance?
                      </p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7">
              El reporte identifica <strong>cinco patrones específicos</strong> que pusieron
              a prueba la cobertura real de los EDR en 2025. La mayoría de organizaciones
              tiene respuesta para uno o dos. Los atacantes los usan todos.
            </p>

            <!-- Propuesta -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;
                           padding:16px 20px">
                  <p style="margin:0;font-size:15px;color:#1e40af;line-height:1.7">
                    Propongo una <strong>sesión de 30 minutos</strong> para convertir esos
                    cinco patrones en una lectura simple de tu postura actual: cobertura,
                    exposición y capacidad de contención.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 28px;font-size:15px;color:#334155;font-weight:600;line-height:1.7">
              ¿Qué espacio te funciona esta semana o la próxima?
            </p>

            <!-- CTA -->
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
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="border-top:1px solid #e2e8f0;padding-top:24px">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a">
                    Salvador Ruiz Esparza
                  </p>
                  <p style="margin:0 0 2px;font-size:13px;color:#64748b">
                    iSEC Infosecurity — Partner ThreatDown by Malwarebytes
                  </p>
                  <p style="margin:0 0 16px;font-size:12px;color:#0ea5e9">
                    <a href="mailto:salvador.ruiz@synappssys.com"
                       style="color:#0ea5e9;text-decoration:none">salvador.ruiz@synappssys.com</a>
                  </p>

                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
            <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.6">
              ⚠️ Este correo fue enviado desde una dirección sin buzón de respuesta.
              Para cualquier consulta, escribe directamente a
              <a href="mailto:salvador.ruiz@synappssys.com"
                 style="color:#94a3b8">salvador.ruiz@synappssys.com</a>.
            </p>
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6">
              Recibiste este correo porque te registraste en un evento de iSEC Infosecurity.
              Si no deseas recibir más comunicaciones, escríbenos con el asunto
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

// ─── Auth ────────────────────────────────────────────────────────────────────
function isAuthorized(request: Request): boolean {
  const key = process.env.RAFFLE_ADMIN_KEY;
  return !!key && request.headers.get("x-admin-key") === key;
}

type ProspectRow = { id: string; nombre: string; correo: string; cargo: string };

// ─── Handler ─────────────────────────────────────────────────────────────────
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

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos.", detail: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;

  // ── Modo test ──────────────────────────────────────────────────────────────
  if ("test" in body) {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${fromDomain}>`,
      to: OWNER_EMAIL,
      subject: `[TEST] ${SUBJECT}`,
      html: buildEmail2Html("Salvador"),
    });
    if (error) return NextResponse.json({ error: "Error al enviar prueba.", detail: error }, { status: 500 });
    return NextResponse.json({ ok: true, mode: "test", sent_to: OWNER_EMAIL });
  }

  const sql = getSqlClient();
  await ensureEventSchema(sql);

  // ── Modo prospecto individual ──────────────────────────────────────────────
  if ("prospect_id" in body) {
    const rows = await sql`
      SELECT id, nombre, correo, cargo FROM event_prospects WHERE id = ${body.prospect_id}
    ` as ProspectRow[];
    const p = rows[0];
    if (!p) return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });

    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${fromDomain}>`,
      to: p.correo,
      subject: SUBJECT,
      html: buildEmail2Html(p.nombre),
    });
    if (error) return NextResponse.json({ error: "Error al enviar.", detail: error }, { status: 500 });
    return NextResponse.json({ ok: true, mode: "single", sent_to: p.correo });
  }

  // ── Modo broadcast ────────────────────────────────────────────────────────
  const allProspects = await sql`
    SELECT id, nombre, correo, cargo FROM event_prospects ORDER BY created_at ASC
  ` as ProspectRow[];

  const targets = allProspects.filter(
    (p) => !CHANNEL_CARGOS.has(p.cargo) && p.correo.includes("@") && !EXCLUDE_EMAILS.has(p.correo.toLowerCase()),
  );

  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = 1200; // Resend: max 5 req/s
  const results: { correo: string; ok: boolean; error?: string }[] = [];
  let globalIdx = 0;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  try {
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const chunk = targets.slice(i, i + BATCH_SIZE);
      const chunkResults = await Promise.all(
        chunk.map((p) => {
          const isFirst = globalIdx++ === 0;
          return resend.emails.send({
            from: `${FROM_NAME} <${fromDomain}>`,
            to: p.correo,
            ...(isFirst ? { bcc: [VALIDATOR_EMAIL] } : {}),
            subject: SUBJECT,
            html: buildEmail2Html(p.nombre),
          }).then(({ data, error }) => ({
            correo: p.correo,
            ok: !error && !!data?.id,
            error: error?.message,
          }));
        }),
      );
      results.push(...chunkResults);
      if (i + BATCH_SIZE < targets.length) await sleep(BATCH_DELAY_MS);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[campaign2] broadcast error:", errMsg);
    const known = await lookupKnownError(sql, errMsg);
    return NextResponse.json(
      { error: "Error durante el broadcast.", detail: errMsg, known_issue: known },
      { status: 500 },
    );
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const sentList = results.filter((r) => r.ok).map((r) => r.correo);
  const failedList = results.filter((r) => !r.ok).map((r) => r.correo);

  const sentDate = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
  await resend.emails.send({
    from: `${FROM_NAME} <${fromDomain}>`,
    to: REPORT_RECIPIENTS,
    subject: `[Reporte] Email 2 enviado — ${sent} destinatarios · ${sentDate}`,
    html: `<table style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <tr><td style="background:#0f172a;padding:20px 28px">
        <p style="margin:0;color:#38bdf8;font-size:13px;font-weight:700;text-transform:uppercase">iSEC — Reporte Email 2</p>
      </td></tr>
      <tr><td style="padding:24px 28px">
        <p style="margin:0 0 6px;font-size:13px;color:#64748b"><strong>Asunto:</strong> ${SUBJECT}</p>
        <p style="margin:0 0 18px;font-size:13px;color:#64748b"><strong>Fecha:</strong> ${sentDate}</p>
        <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#16a34a">✅ ${sent} enviados</p>
        <p style="margin:0 0 18px;font-size:22px;font-weight:800;color:#dc2626">❌ ${failed} fallidos</p>
        ${sentList.length > 0 ? `<p style="margin:0 0 6px;font-size:12px;color:#64748b;font-weight:700">DESTINATARIOS:</p><p style="margin:0;font-size:12px;color:#475569;line-height:1.8">${sentList.join("<br>")}</p>` : ""}
        ${failedList.length > 0 ? `<p style="margin:18px 0 6px;font-size:12px;color:#dc2626;font-weight:700">FALLIDOS:</p><p style="margin:0;font-size:12px;color:#dc2626;line-height:1.8">${failedList.join("<br>")}</p>` : ""}
      </td></tr>
    </table>`,
  });

  return NextResponse.json({ ok: true, mode: "broadcast", sent, failed, results });
}
