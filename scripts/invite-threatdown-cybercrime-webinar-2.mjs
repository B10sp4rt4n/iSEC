import { readFileSync, writeFileSync } from "fs";
import { Resend } from "resend";
import { neon } from "@neondatabase/serverless";

const SUBJECT    = "Aún estás a tiempo — Webinar Cybercrime IA este miércoles";
const PREHEADER  = "Los ataques potenciados con IA crecen 41% anual. Regístrate gratis antes del miércoles 9 Sep · 12:00 PM CDMX.";
const FROM_FALLBACK = "ThreatDown Soluciones <contacto@synappssys.com>";
const CAMPAIGN_KEY  = "threatdown_cybercrime_webinar2_2026";

const WEBINAR_URL  = "https://www.threatdown.com/lp-ai-cybercrime-report-webinar/";
const REPORT_URL   = "https://www.threatdown.com/dl-cybercrime-in-age-of-ai-2026/";
const THREATDOWN_URL = "https://www.threatdown.com/";

// ── Stats — reemplazar con datos duros reales antes del broadcast
const STATS = [
  { value: "+41%",  label: "crecimiento anual en ataques potenciados por IA (2024–2025)" },
  { value: "87%",   label: "de organizaciones en LATAM reportó al menos un incidente en 2025" },
  { value: "$4.9M", label: "costo promedio global por brecha de datos (IBM 2024)" },
];

function loadEnvLocal() {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );
}

function getSiteUrl(env) {
  return (process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? env.URL ?? env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}

function buildHtml(env, { email }) {
  const base = getSiteUrl(env);
  const logoSrc        = `${base}/logos/ThreatDown_2.0_Stacked_Reverse.png`;
  const partnerLogoSrc = `${base}/logos/SynAppsSysLogoQ326.png`;

  const trackUrl = (key, dest) => base
    ? `${base}/api/track?c=${CAMPAIGN_KEY}_${key}&email=${encodeURIComponent(email)}`
    : dest;

  const ctaWebinar    = trackUrl("cta", WEBINAR_URL);
  const ctaReport     = trackUrl("report", REPORT_URL);
  const ctaThreatdown = trackUrl("td", THREATDOWN_URL);

  const statsHtml = STATS.map((s, i) => `
    <td style="padding:0 ${i === 1 ? "3px" : i === 0 ? "6px 0 0" : "0 0 0 6px"};width:33%;">
      <div style="background:#091525;border:1px solid #1B2D50;border-radius:10px;padding:18px 14px;text-align:center;">
        <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#63D89A;">${s.value}</p>
        <p style="margin:0;font-size:11px;color:#7A90B0;line-height:1.5;">${s.label}</p>
      </div>
    </td>`).join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#0A1228;font-family:Arial,Helvetica,sans-serif;color:#F5F7FA;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${PREHEADER}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A1228;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#0D1B3E;border-radius:14px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.6);">

        <!-- HEADER -->
        <tr>
          <td style="padding:36px 36px 28px;text-align:center;background:linear-gradient(180deg,#0D2218 0%,#0D1B3E 100%);">
            <img src="${logoSrc}" alt="ThreatDown" style="display:block;margin:0 auto 20px;max-width:190px;width:100%;height:auto;" />
            <p style="margin:0 0 16px;text-align:center;">
              <span style="display:inline-block;background:#63D89A;color:#061A10;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:5px 18px;border-radius:20px;">WEBINAR GRATUITO</span>
              &nbsp;
              <span style="display:inline-block;background:#1B2D50;color:#B9C4D3;font-size:12px;font-weight:600;padding:5px 14px;border-radius:20px;vertical-align:middle;">Mi&eacute;rcoles 9 Sep &nbsp;·&nbsp; 12:00 PM CDMX</span>
            </p>
            <h1 style="margin:0;font-size:26px;line-height:1.3;color:#F5F7FA;font-weight:700;">A&uacute;n est&aacute;s a tiempo.<br/>El webinar es este mi&eacute;rcoles.</h1>
          </td>
        </tr>

        <!-- URGENCIA -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#C8D6E8;">
              El cibercrimen evolucion&oacute; con la IA — y los equipos de seguridad tienen una ventana corta para ponerse al d&iacute;a. ThreatDown comparte los hallazgos de su reporte <strong style="color:#63D89A;">Cybercrime in the Age of AI 2026</strong> en un webinar de 45 minutos este mi&eacute;rcoles.
            </p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#C8D6E8;">
              El registro es gratuito y la grabaci&oacute;n queda disponible para quienes se inscriban.
            </p>
          </td>
        </tr>

        <!-- STATS -->
        <tr>
          <td style="padding:24px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>${statsHtml}</tr>
            </table>
          </td>
        </tr>

        <!-- DETALLES -->
        <tr>
          <td style="padding:20px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#091525;border:1px solid #1B2D50;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(90deg,#1A9150 0%,#0E6B3E 100%);padding:10px 20px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#D4FAEB;letter-spacing:.1em;text-transform:uppercase;">Fecha y hora</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr valign="top">
                      <td style="width:50%;padding-right:16px;border-right:1px solid #1B2D50;">
                        <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#F5F7FA;">Mi&eacute;rcoles 9 de septiembre</p>
                        <p style="margin:0;font-size:14px;color:#63D89A;font-weight:700;">10:00 AM PT &nbsp;·&nbsp; 12:00 PM CDMX</p>
                        <p style="margin:4px 0 0;font-size:11px;color:#5A7090;">Hora Centro — M&eacute;xico</p>
                      </td>
                      <td style="width:50%;padding-left:16px;">
                        <p style="margin:0 0 2px;font-size:14px;color:#F5F7FA;">Duraci&oacute;n: <strong>45 minutos</strong></p>
                        <p style="margin:0 0 2px;font-size:14px;color:#F5F7FA;">Registro: <strong style="color:#63D89A;">Gratuito</strong></p>
                        <p style="margin:4px 0 0;font-size:11px;color:#5A7090;">Grabaci&oacute;n disponible para inscritos</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- 3 BOTONES -->
        <tr>
          <td style="padding:24px 36px 8px;">

            <!-- Botón primario: Webinar -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">
              <tr>
                <td align="center" style="border-radius:8px;background:linear-gradient(90deg,#1A9150 0%,#27AE60 100%);box-shadow:0 8px 24px rgba(39,174,96,.3);">
                  <a href="${ctaWebinar}" style="display:block;padding:16px 24px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">Registrarme al webinar &nbsp;&#8250;</a>
                </td>
              </tr>
            </table>

            <!-- Tarjetas secundarias: Reporte | ThreatDown -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr valign="top">

                <!-- Reporte -->
                <td style="width:50%;padding-right:6px;">
                  <a href="${ctaReport}" style="display:block;text-decoration:none;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#091525;border:1px solid #3A5070;border-radius:10px;">
                      <tr>
                        <td height="120" style="padding:20px 16px;text-align:center;vertical-align:middle;">
                          <p style="margin:0 0 8px;font-size:22px;color:#63D89A;font-weight:800;line-height:1;">&#8595;</p>
                          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#F5F7FA;">Descarga aqu&iacute; el reporte</p>
                          <p style="margin:0;font-size:11px;color:#7A90B0;">Cybercrime AI 2026</p>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>

                <!-- ThreatDown -->
                <td style="width:50%;padding-left:6px;">
                  <a href="${ctaThreatdown}" style="display:block;text-decoration:none;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0D2218;border:1px solid #1E5C38;border-radius:10px;">
                      <tr>
                        <td height="120" style="padding:20px 16px;text-align:center;vertical-align:middle;">
                          <img src="${logoSrc}" alt="ThreatDown" style="display:block;margin:0 auto 8px;max-width:100px;width:100%;height:auto;" />
                          <p style="margin:0;font-size:13px;font-weight:700;color:#63D89A;">Conocer ThreatDown</p>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>

              </tr>
            </table>

            <p style="margin:14px 0 0;text-align:center;font-size:11px;color:#3A5070;">Registro gratuito &nbsp;&#8226;&nbsp; Mi&eacute;rcoles 9 Sep &nbsp;&#8226;&nbsp; 12:00 PM CDMX</p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:24px 36px 28px;border-top:1px solid #1B2D50;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:0 0 18px;">
                <img src="${partnerLogoSrc}" alt="SynAppsSys" style="display:block;margin:0 auto;max-width:150px;width:100%;height:auto;" />
              </td></tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
              <tr valign="top">
                <td width="50%" style="padding:0 8px 0 0;text-align:center;border-right:1px solid #1B2D50;">
                  <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#F5F7FA;">Estela Cota</p>
                  <p style="margin:0 0 1px;font-size:10px;color:#7A90B0;">Territory Channel Account Manager</p>
                  <p style="margin:0 0 4px;font-size:10px;color:#7A90B0;">LATAM &nbsp;·&nbsp; ThreatDown by Malwarebytes</p>
                  <a href="mailto:ecota@threatdown.com" style="font-size:10px;color:#63D89A;text-decoration:none;">ecota@threatdown.com</a>
                </td>
                <td width="50%" style="padding:0 0 0 8px;text-align:center;">
                  <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#F5F7FA;">Salvador Ruiz</p>
                  <p style="margin:0 0 1px;font-size:10px;color:#7A90B0;">Director General &nbsp;·&nbsp; SynAppsSys</p>
                  <p style="margin:0 0 4px;font-size:10px;color:#7A90B0;">Platinum Partner ThreatDown</p>
                  <a href="mailto:salvador.ruiz@synappssys.com" style="font-size:10px;color:#63D89A;text-decoration:none;">salvador.ruiz@synappssys.com</a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:10px;color:#5A7090;text-align:center;line-height:1.6;">
              Recibiste este correo porque tuviste contacto con SynAppsSys o asististe a un evento de iSEC.<br/>
              Si no deseas recibir m&aacute;s comunicaciones, <a href="mailto:contacto@synappssys.com?subject=Baja%20de%20lista" style="color:#7A90B0;text-decoration:underline;">da clic aqu&iacute; para darte de baja</a>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Track destinations (registrar en API route antes del broadcast) ───────────
// threatdown_cybercrime_webinar2_2026_cta    → WEBINAR_URL
// threatdown_cybercrime_webinar2_2026_report → REPORT_URL
// threatdown_cybercrime_webinar2_2026_td     → THREATDOWN_URL

// ─── Test ─────────────────────────────────────────────────────────────────────

async function sendTest(env) {
  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.RESEND_FROM ? `ThreatDown Soluciones <${env.RESEND_FROM}>` : FROM_FALLBACK;
  const to = "sruiz@synappssys.com";

  const { data, error } = await resend.emails.send({
    from,
    to,
    reply_to: "salvador.ruiz@synappssys.com",
    subject: `[TEST] ${SUBJECT}`,
    html: buildHtml(env, { email: to }),
  });

  if (error) throw new Error(`Fallo: ${error.message}`);
  console.log(`✅ Test enviado — ID: ${data?.id}`);
}

function buildPreviewFile(env) {
  const html = buildHtml(env, { email: "preview@synappssys.com" });
  const out = "scripts/invite-threatdown-cybercrime-webinar-2.preview.html";
  writeFileSync(out, html, "utf8");
  console.log(`Preview: ${out}`);
}

// ─── Broadcast (lista filtrada — se cargará desde archivo o BD) ──────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendBroadcast(env, recipients) {
  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.RESEND_FROM ? `ThreatDown Soluciones <${env.RESEND_FROM}>` : FROM_FALLBACK;

  console.log(`\nBroadcast — ${recipients.length} destinatarios · 10s por correo`);
  console.log(`Tiempo estimado: ~${Math.round((recipients.length * 10) / 60)} min\n`);

  const results = [];
  for (let i = 0; i < recipients.length; i++) {
    const { correo } = recipients[i];
    const { data, error } = await resend.emails.send({
      from,
      to: correo,
      reply_to: "salvador.ruiz@synappssys.com",
      subject: SUBJECT,
      html: buildHtml(env, { email: correo }),
    });
    results.push({ correo, ok: !error && !!data?.id, id: data?.id, error: error?.message });
    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    process.stdout.write(`\r  [${i + 1}/${recipients.length}] ✅ ${sent} · ❌ ${failed} — ${correo}`);
    if (i < recipients.length - 1) await sleep(10000);
  }

  console.log("\n");
  const sent = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  console.log(`✅ Enviados: ${sent.length}`);
  console.log(`❌ Fallidos: ${failed.length}`);
  if (failed.length) for (const f of failed) console.log(`  ${f.correo} — ${f.error}`);

  // Reporte
  const sentDate = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
  await resend.emails.send({
    from,
    to: ["ecotae0@gmail.com", "ecota@threatdown.com", "salvador.ruiz@synappssys.com"],
    subject: `[Reporte Webinar 2] ${sent.length} enviados · ${sentDate}`,
    html: `<table style="font-family:Arial,sans-serif;max-width:600px;border:1px solid #1B2D50;border-radius:8px;overflow:hidden">
      <tr><td style="background:#0D1B3E;padding:16px 24px;color:#63D89A;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Reporte · Campaña Webinar 2 (lista filtrada)</td></tr>
      <tr><td style="padding:20px 24px;font-size:13px;color:#334155">
        <p><strong>Fecha:</strong> ${sentDate}</p>
        <p><strong>Asunto:</strong> ${SUBJECT}</p>
        <table style="border-collapse:collapse;width:100%;margin:12px 0">
          <tr style="background:#f1f5f9"><td style="padding:10px 14px;font-weight:700">✅ Enviados</td><td style="padding:10px 14px;font-size:24px;font-weight:800;color:#16a34a">${sent.length}</td></tr>
          <tr><td style="padding:10px 14px;font-weight:700">❌ Fallidos</td><td style="padding:10px 14px;font-size:24px;font-weight:800;color:#dc2626">${failed.length}</td></tr>
        </table>
        <p style="font-size:11px;color:#475569;line-height:1.9;">${sent.map((r) => r.correo).join("<br>")}</p>
        ${failed.length ? `<p style="font-size:11px;color:#dc2626">${failed.map((f) => f.correo).join("<br>")}</p>` : ""}
      </td></tr>
    </table>`,
  });
  console.log("Reporte enviado.");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const env = loadEnvLocal();
  const shouldSend    = process.argv.includes("--send-test");
  const shouldCast    = process.argv.includes("--broadcast");
  const shouldPreview = process.argv.includes("--preview") || (!shouldSend && !shouldCast);

  if (shouldSend) { await sendTest(env); return; }
  if (shouldCast) {
    // Lista filtrada — se pasa como argumento: --list ruta/lista.json
    // Formato JSON: [{ "correo": "a@b.com", "nombre": "Nombre" }, ...]
    const listArg = process.argv[process.argv.indexOf("--list") + 1];
    if (!listArg) { console.error("Falta --list <archivo.json>"); process.exit(1); }
    const recipients = JSON.parse(readFileSync(listArg, "utf8"));
    await sendBroadcast(env, recipients);
    return;
  }
  buildPreviewFile(env);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
