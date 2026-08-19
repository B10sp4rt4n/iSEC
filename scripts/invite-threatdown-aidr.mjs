import { readFileSync, writeFileSync } from "fs";
import { Resend } from "resend";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import { neon } from "@neondatabase/serverless";

const SUBJECT = "El 78% del Shadow AI en tu empresa ya está en los endpoints";
const PREHEADER = "ThreatDown AIDR: ve, clasifica y gobierna el uso de IA en tu organización desde hoy.";
const TEST_RECIPIENT = "salvador.ruiz@synappssys.com";
const TEST_NAME = "Salvador";
const FROM_FALLBACK = "ThreatDown Soluciones <contacto@synappssys.com>";
const CALENDLY = "https://calendly.com/salvador-ruiz-synappssys";
const CAMPAIGN_KEY = "threatdown_aidr_2026";
const PDF_PATH = "ThreatDown AIDR.pdf";
const THREATDOWN_LOGO_FILE = "public/logos/ThreatDown_2.0_Stacked_Reverse.png";
const PARTNER_LOGO_FILE = "public/logos/SynAppsSysLogoQ326.png";

function loadEnvLocal() {
  const text = readFileSync(".env.local", "utf8");
  const pairs = text
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    });
  return Object.fromEntries(pairs);
}

function getSiteUrl(env) {
  return (
    process.env.URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    env.URL ??
    env.NEXT_PUBLIC_SITE_URL ??
    ""
  );
}

function buildCalUrl(env, email, nombre) {
  const base = getSiteUrl(env);
  if (!base) return CALENDLY;
  const cleanBase = base.replace(/\/$/, "");
  const params = new URLSearchParams({ nombre, email, campaign: CAMPAIGN_KEY });
  return `${cleanBase}/api/cal?${params.toString()}`;
}

function buildHtml(env, { email }) {
  const ctaUrl = buildCalUrl(env, email, "");
  const base = getSiteUrl(env).replace(/\/$/, "");
  const logoSrc = `${base}/logos/ThreatDown_2.0_Stacked_Reverse.png`;
  const partnerLogoSrc = `${base}/logos/SynAppsSysLogoQ326.png`;

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
              <span style="display:inline-block;background:#63D89A;color:#061A10;font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:6px 20px;border-radius:20px;">AIDR</span>
              &nbsp;
              <span style="display:inline-block;color:#B9C4D3;font-size:14px;font-weight:600;letter-spacing:.04em;padding:6px 0;vertical-align:middle;">Visibilidad y Gobierno de <span style="color:#63D89A;font-weight:700;">IA</span></span>
            </p>
            <h1 style="margin:0;font-size:28px;line-height:1.3;color:#F5F7FA;font-weight:700;">Del riesgo invisible al control inteligente</h1>
          </td>
        </tr>

        <!-- INTRO: 2 columnas -->
        <tr>
          <td style="padding:28px 36px 0;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr valign="middle">
                <td width="55%" style="padding:0 14px 0 0;">
                  <p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#B9C4D3;">Hola,</p>
                  <p style="margin:0;font-size:15px;line-height:1.8;color:#B9C4D3;">Hoy muchas organizaciones usan inteligencia artificial sin tener visibilidad clara de <strong style="color:#F5F7FA;">qui&eacute;n</strong> la usa, <strong style="color:#F5F7FA;">qu&eacute; herramientas</strong> utilizan y <strong style="color:#F5F7FA;">con qu&eacute; frecuencia</strong>. Ese punto ciego es donde comienza el riesgo de <strong style="color:#F5F7FA;">Shadow <span style="color:#63D89A;">AI</span></strong>.</p>
                </td>
                <td width="45%" style="text-align:center;">
                  <img src="${base}/aidr-illustration.png" alt="Shadow AI" style="display:block;width:100%;max-width:230px;height:auto;border-radius:8px;margin:0 auto;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- STATS -->
        <tr>
          <td style="padding:24px 36px 0;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="32%" style="padding:0 6px 0 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:10px;">
                    <tr><td style="padding:20px 10px;text-align:center;">
                      <p style="margin:0 0 4px;font-size:24px;line-height:1;">&#128100;</p>
                      <p style="margin:0;font-size:30px;font-weight:700;color:#63D89A;line-height:1;">&gt;80%</p>
                      <p style="margin:8px 0 0;font-size:11px;color:#B9C4D3;line-height:1.5;">de trabajadores de oficina usan IA en el trabajo</p>
                    </td></tr>
                  </table>
                </td>
                <td width="36%" style="padding:0 3px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:10px;">
                    <tr><td style="padding:20px 10px;text-align:center;">
                      <p style="margin:0 0 4px;font-size:24px;line-height:1;">&#128737;</p>
                      <p style="margin:0;font-size:30px;font-weight:700;color:#63D89A;line-height:1;">22%</p>
                      <p style="margin:8px 0 0;font-size:11px;color:#B9C4D3;line-height:1.5;">usa solo herramientas autorizadas</p>
                    </td></tr>
                  </table>
                </td>
                <td width="32%" style="padding:0 0 0 6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:10px;">
                    <tr><td style="padding:20px 10px;text-align:center;">
                      <p style="margin:0 0 4px;font-size:24px;line-height:1;">&#128181;</p>
                      <p style="margin:0;font-size:30px;font-weight:700;color:#63D89A;line-height:1;">$670K</p>
                      <p style="margin:8px 0 0;font-size:11px;color:#B9C4D3;line-height:1.5;">costo adicional por brecha con Shadow AI</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:8px 0 0;font-size:10px;color:#2E4060;">*Fuentes: IBM, Verizon DBIR 2026, Gartner.</p>
          </td>
        </tr>

        <!-- BENEFICIOS: 2 columnas -->
        <tr>
          <td style="padding:28px 36px 0;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr valign="top">

                <!-- IZQUIERDA: beneficios -->
                <td width="48%" style="padding:0 10px 0 0;">
                  <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#63D89A;text-transform:uppercase;letter-spacing:.08em;">AIDR te da visibilidad total</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:0 0 8px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:8px;">
                        <tr>
                          <td width="36" style="padding:12px 0 12px 12px;vertical-align:middle;font-size:20px;line-height:1;">&#128269;</td>
                          <td style="padding:12px 10px 12px 6px;"><p style="margin:0;font-size:12px;color:#F5F7FA;line-height:1.5;">Ve qu&eacute; herramientas de IA est&aacute;n activas hoy &mdash; sin suposiciones</p></td>
                        </tr>
                      </table>
                    </td></tr>
                    <tr><td style="padding:0 0 8px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:8px;">
                        <tr>
                          <td width="36" style="padding:12px 0 12px 12px;vertical-align:middle;font-size:20px;line-height:1;">&#128202;</td>
                          <td style="padding:12px 10px 12px 6px;"><p style="margin:0;font-size:12px;color:#F5F7FA;line-height:1.5;">Identifica qui&eacute;n la usa, cu&aacute;nto y qu&eacute; herramientas</p></td>
                        </tr>
                      </table>
                    </td></tr>
                    <tr><td>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:8px;">
                        <tr>
                          <td width="36" style="padding:12px 0 12px 12px;vertical-align:middle;font-size:20px;line-height:1;">&#9989;</td>
                          <td style="padding:12px 10px 12px 6px;"><p style="margin:0;font-size:12px;color:#F5F7FA;line-height:1.5;">Toma decisiones informadas sin agregar complejidad operativa</p></td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </td>

                <!-- DERECHA: dashboard screenshot -->
                <td width="52%" style="padding:0 0 0 10px;">
                  <img src="${base}/aidr-dashboard.png" alt="AIDR Dashboard" style="display:block;width:110%;max-width:110%;height:auto;border-radius:8px;margin-left:-5%;" />
                </td>

              </tr>
            </table>
          </td>
        </tr>

        <!-- DISPONIBILIDAD BANNER -->
        <tr>
          <td style="padding:20px 36px 0;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(90deg,#0D2A1A 0%,#122E1F 100%);border:1px solid #1E5C38;border-radius:10px;">
              <tr>
                <td width="48" style="padding:16px 0 16px 18px;vertical-align:middle;font-size:20px;color:#63D89A;">&#9989;</td>
                <td style="padding:16px 18px 16px 6px;">
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#B9C4D3;">
                    Disponible en todas las soluciones de ThreatDown &mdash;
                    <strong style="color:#63D89A;">sin costo adicional.</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 36px 10px;background:#0D1B3E;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="border-radius:8px;background:linear-gradient(90deg,#1A9150 0%,#27AE60 100%);box-shadow:0 8px 24px rgba(39,174,96,.3);">
                  <a href="${ctaUrl}" style="display:block;padding:17px 24px;font-size:16px;line-height:1.3;font-weight:700;color:#ffffff;text-decoration:none;">Programa una evaluaci&oacute;n gratuita de Shadow AI &nbsp;&#8250;</a>
                </td>
              </tr>
            </table>
            <p style="margin:10px 0 0;text-align:center;font-size:11px;color:#2E4060;">Sin compromiso &nbsp;&#8226;&nbsp; 30 minutos &nbsp;&#8226;&nbsp; Valor desde el primer d&iacute;a</p>
            <p style="margin:10px 0 0;text-align:center;font-size:12px;">
              <a href="https://www.threatdown.com/products/ai-detection-and-response/" style="color:#63D89A;text-decoration:none;">Conoce m&aacute;s sobre ThreatDown AIDR &rarr;</a>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:22px 36px 28px;border-top:1px solid #1B2D50;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:0 0 14px;">
                <img src="${partnerLogoSrc}" alt="SynAppsSys" style="display:block;margin:0 auto;max-width:150px;width:100%;height:auto;" />
              </td></tr>
            </table>
            <p style="margin:0;font-size:11px;color:#7A90B0;line-height:1.9;text-align:center;">
              Salvador Ruiz &nbsp;&#124;&nbsp; SynAppsSys &nbsp;&#124;&nbsp; Platinum Partner ThreatDown<br/>
              <a href="mailto:salvador.ruiz@synappssys.com" style="color:#63D89A;text-decoration:none;">salvador.ruiz@synappssys.com</a> &nbsp;&#124;&nbsp; www.synappssys.com
            </p>
            <p style="margin:16px 0 0;font-size:10px;color:#5A7090;text-align:center;line-height:1.6;">
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

async function sendTest(env) {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no esta configurado en .env.local");
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.RESEND_FROM
    ? `ThreatDown Soluciones <${env.RESEND_FROM}>`
    : FROM_FALLBACK;

  const attachments = [];
  try {
    attachments.push({ filename: "AIDR ThreatDown.pdf", content: readFileSync(PDF_PATH) });
  } catch {
    console.warn(`Aviso: no se encontro el PDF en "${PDF_PATH}" — se envia sin adjunto.`);
  }

  const { data, error } = await resend.emails.send({
    from,
    to: TEST_RECIPIENT,
    reply_to: "salvador.ruiz@synappssys.com",
    subject: `[TEST] ${SUBJECT}`,
    html: buildHtml(env, { email: TEST_RECIPIENT }),
    attachments,
  });

  if (error) {
    throw new Error(`Fallo el envio de prueba: ${error.message}`);
  }

  console.log("Prueba enviada correctamente.");
  console.log(`Email ID: ${data?.id ?? "(sin id)"}`);
  console.log(`Destino:  ${TEST_RECIPIENT}`);
}

function buildPreviewFile(env) {
  const html = buildHtml(env, { email: "preview@synappssys.com" });
  const out = "scripts/invite-threatdown-aidr.preview.html";
  writeFileSync(out, html, "utf8");
  console.log(`Preview generado en: ${out}`);
  console.log(`Asunto:   ${SUBJECT}`);
  console.log(`Preheader: ${PREHEADER}`);
  console.log(`CTA URL:  ${CALENDLY}`);
}

// ─── Listas de destinatarios ──────────────────────────────────────────────────

const CHANNEL_CARGOS = new Set([
  "reseller", "reseller_ventas", "reseller_preventa", "reseller_gerente",
  "vendor_am", "vendor_se", "vendor_channel", "vendor_mktg",
]);

const EXCLUDE_EMAILS = new Set([
  "sruiz@synappssys.com",
  "salvador.ruizesparza.mx@gmail.com",
  "b10sp4rt4n@gmail.com",
]);

const ALWAYS_INCLUDE = [
  { correo: "ecota@threatdown.com", nombre: "Estela Cota" },
  { correo: "ecotae0@gmail.com",    nombre: "Estela Cota" },
];

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "hotmail.com", "hotmail.es", "yahoo.com", "yahoo.com.mx",
  "outlook.com", "live.com", "icloud.com",
]);

function pickBestEmail(raw) {
  const parts = raw.split(";").map((s) => s.trim().toLowerCase()).filter((s) => s.includes("@"));
  const corp = parts.find((e) => !PERSONAL_DOMAINS.has(e.split("@")[1] ?? ""));
  return corp ?? parts[0] ?? "";
}

function isCanal(tipo) {
  return String(tipo).toUpperCase().includes("EMPRESA CANAL IT") &&
         !String(tipo).toUpperCase().includes("INVITADO VIP");
}

async function buildRecipientList(env) {
  const seen = new Set();
  const list = [];

  function add(correo, nombre) {
    const email = correo.toLowerCase().trim();
    if (!email.includes("@") || EXCLUDE_EMAILS.has(email) || seen.has(email)) return;
    seen.add(email);
    list.push({ correo: email, nombre });
  }

  // 1. Base de datos
  if (env.DATABASE_URL) {
    const sql = neon(env.DATABASE_URL);
    const rows = await sql`
      SELECT nombre, correo, cargo FROM event_prospects ORDER BY created_at ASC
    `;
    for (const r of rows) {
      if (!CHANNEL_CARGOS.has(r.cargo)) add(r.correo, r.nombre);
    }
  }

  // 2. Excel Estela Cota
  try {
    const wb = xlsxRead(readFileSync("prospeccion_estela_cota (1).xlsx"));
    const raw = xlsxUtils.sheet_to_json(wb.Sheets["Prospectos"], { header: 1, defval: "" });
    const h = raw[3].map((x) => String(x).trim().toLowerCase());
    const ci = h.findIndex((x) => x.includes("correo") || x.includes("email") || x.includes("mail"));
    const ni = h.findIndex((x) => x.includes("contacto") || x.includes("nombre"));
    for (const row of raw.slice(4)) add(String(row[ci] ?? "").trim(), String(row[ni] ?? "").trim());
  } catch {
    console.warn("Aviso: prospeccion_estela_cota (1).xlsx no encontrado — se omite.");
  }

  // 3. Excel ISEC Base Deduplicada
  try {
    const wb = xlsxRead(readFileSync("ISEC_InfoSecurity_2026_Base_Deduplicada.xlsx"));
    const raw = xlsxUtils.sheet_to_json(wb.Sheets["Base deduplicada"], { header: 1, defval: "" });
    for (const row of raw.slice(4)) {
      if (isCanal(row[1])) continue;
      const correo = pickBestEmail(String(row[7] ?? ""));
      const nombre = [String(row[5] ?? "").trim(), String(row[4] ?? "").trim()].filter(Boolean).join(" ");
      add(correo, nombre);
    }
  } catch {
    console.warn("Aviso: ISEC_InfoSecurity_2026_Base_Deduplicada.xlsx no encontrado — se omite.");
  }

  // 4. Siempre incluir
  for (const r of ALWAYS_INCLUDE) {
    if (!seen.has(r.correo)) {
      seen.add(r.correo);
      list.push(r);
    }
  }

  return list;
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

async function sendBroadcast(env) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY no configurado.");

  const recipients = await buildRecipientList(env);
  console.log(`\nDestinatarios a enviar: ${recipients.length}`);

  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.RESEND_FROM ? `ThreatDown Soluciones <${env.RESEND_FROM}>` : FROM_FALLBACK;

  const attachments = [];
  try {
    attachments.push({ filename: "ThreatDown AIDR.pdf", content: readFileSync(PDF_PATH) });
  } catch {
    console.warn(`Aviso: PDF no encontrado en "${PDF_PATH}" — se envía sin adjunto.`);
  }

  const BATCH = 5;
  const results = [];

  for (let i = 0; i < recipients.length; i += BATCH) {
    const chunk = recipients.slice(i, i + BATCH);
    const chunkResults = await Promise.all(
      chunk.map(({ correo }) =>
        resend.emails.send({
          from,
          replyTo: "salvador.ruiz@synappssys.com",
          to: correo,
          subject: SUBJECT,
          html: buildHtml(env, { email: correo }),
          attachments,
        }).then(({ data, error }) => ({ correo, ok: !error && !!data?.id, id: data?.id, error: error?.message }))
      )
    );
    results.push(...chunkResults);
    const sent = results.filter((r) => r.ok).length;
    process.stdout.write(`\r  Progreso: ${i + chunk.length}/${recipients.length} enviados (${results.filter(r=>!r.ok).length} fallidos)`);
  }

  console.log("\n");
  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`✅ Enviados:  ${sent}`);
  console.log(`❌ Fallidos: ${failed.length}`);
  if (failed.length > 0) {
    console.log("Fallidos:");
    for (const f of failed) console.log(`  ${f.correo} — ${f.error}`);
  }

  // Notificación de resumen
  const sentDate = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
  await resend.emails.send({
    from,
    to: ["ecotae0@gmail.com", "salvador.ruiz@synappssys.com"],
    subject: `[Reporte AIDR] ${sent} enviados · ${sentDate}`,
    html: `<table style="font-family:Arial,sans-serif;max-width:520px;border:1px solid #1B2D50;border-radius:8px;overflow:hidden">
      <tr><td style="background:#0D1B3E;padding:16px 24px;color:#63D89A;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Reporte · Campaña ThreatDown AIDR</td></tr>
      <tr><td style="padding:20px 24px;font-family:Arial,sans-serif;font-size:13px;color:#334155">
        <p style="margin:0 0 8px"><strong>Fecha:</strong> ${sentDate}</p>
        <p style="margin:0 0 8px"><strong>Asunto:</strong> ${SUBJECT}</p>
        <p style="margin:0 0 16px"><strong>Fuentes:</strong> BD + Excel Cota + Excel ISEC 2026</p>
        <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#16a34a">✅ ${sent} enviados</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#dc2626">❌ ${failed.length} fallidos</p>
        ${failed.length > 0 ? `<p style="margin:16px 0 4px;font-size:11px;color:#dc2626;font-weight:700">FALLIDOS:</p><p style="margin:0;font-size:11px;color:#dc2626">${failed.map(f=>f.correo).join("<br>")}</p>` : ""}
      </td></tr>
    </table>`,
  });

  console.log("Reporte enviado a ecotae0@gmail.com y salvador.ruiz@synappssys.com");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const env = loadEnvLocal();
  const shouldSend    = process.argv.includes("--send-test");
  const shouldCast    = process.argv.includes("--broadcast");
  const shouldPreview = process.argv.includes("--preview") || (!shouldSend && !shouldCast);

  if (shouldCast) {
    await sendBroadcast(env);
    return;
  }

  if (shouldSend) {
    await sendTest(env);
    return;
  }

  buildPreviewFile(env);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
