import { readFileSync, writeFileSync } from "fs";
import { Resend } from "resend";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import { neon } from "@neondatabase/serverless";

const SUBJECT = "Los atacantes ya usan IA. ¿Tu equipo está listo? [Webinar Sep 9]";
const PREHEADER = "ThreatDown presenta: Cibercrimen en la Era de la IA 2026. Webinar gratuito · Miércoles 9 Sep · 12:00 PM CDMX.";
const TEST_RECIPIENTS = [
  "salvador.ruiz@synappssys.com",
  "salvador_ruiz74@hotmail.com",
  "sruiz@synappssys.com",
];
const TEST_RECIPIENT = TEST_RECIPIENTS[0];
const TEST_NAME = "Salvador";
const FROM_FALLBACK = "ThreatDown Soluciones <contacto@synappssys.com>";
const WEBINAR_URL = "https://www.threatdown.com/dl-cybercrime-in-age-of-ai-2026/";
const CAMPAIGN_KEY = "threatdown_cybercrime_webinar_2026";
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

function buildHtml(env, { email }) {
  const base = getSiteUrl(env).replace(/\/$/, "");
  const logoSrc = `${base}/logos/ThreatDown_2.0_Stacked_Reverse.png`;
  const partnerLogoSrc = `${base}/logos/SynAppsSysLogoQ326.png`;
  const illustrationSrc = `${base}/aidr-illustration.png`;
  const ctaUrl = base
    ? `${base}/api/track?c=${CAMPAIGN_KEY}_cta&email=${encodeURIComponent(email)}`
    : WEBINAR_URL;
  const reportUrl = base
    ? `${base}/api/track?c=${CAMPAIGN_KEY}_report&email=${encodeURIComponent(email)}`
    : WEBINAR_URL;

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
              <span style="display:inline-block;background:#63D89A;color:#061A10;font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:6px 20px;border-radius:20px;">WEBINAR GRATUITO</span>
              &nbsp;
              <span style="display:inline-block;color:#B9C4D3;font-size:14px;font-weight:600;letter-spacing:.04em;padding:6px 0;vertical-align:middle;">Cybercrime in the <span style="color:#63D89A;font-weight:700;">Age of AI</span> 2026</span>
            </p>
            <h1 style="margin:0;font-size:28px;line-height:1.3;color:#F5F7FA;font-weight:700;">Los atacantes ya usan IA.<br/>Tu defensa tambi&eacute;n debe hacerlo.</h1>
          </td>
        </tr>

        <!-- INTRO: 2 columnas -->
        <tr>
          <td style="padding:28px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr valign="top">
                <!-- Texto -->
                <td style="width:58%;padding-right:20px;">
                  <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#C8D6E8;">
                    ThreatDown presenta su reporte anual <strong style="color:#63D89A;">Cybercrime in the Age of AI 2026</strong> — un an&aacute;lisis profundo de c&oacute;mo los grupos de amenaza est&aacute;n aprovechando la inteligencia artificial para escalar y acelerar sus ataques.
                  </p>
                  <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#C8D6E8;">
                    En este webinar de <strong style="color:#F5F7FA;">45 minutos</strong>, los expertos de ThreatDown compartir&aacute;n hallazgos clave del reporte y estrategias concretas de defensa que tu equipo puede implementar hoy.
                  </p>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#7A90B0;">
                    Registro gratuito · Grabaci&oacute;n disponible para inscritos
                  </p>
                </td>
                <!-- Imagen -->
                <td style="width:42%;text-align:center;">
                  <img src="${illustrationSrc}" alt="Cibercrimen e IA" style="display:block;max-width:240px;width:100%;height:auto;border-radius:10px;opacity:.92;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- STATS ROW -->
        <tr>
          <td style="padding:24px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 6px 0 0;width:33%;">
                  <div style="background:#091525;border:1px solid #1B2D50;border-radius:10px;padding:18px 14px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#63D89A;">+41%</p>
                    <p style="margin:0;font-size:11px;color:#7A90B0;line-height:1.5;">crecimiento en ataques potenciados por IA (2024&ndash;2025)</p>
                  </div>
                </td>
                <td style="padding:0 3px;width:34%;">
                  <div style="background:#091525;border:1px solid #1B2D50;border-radius:10px;padding:18px 14px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#63D89A;">87%</p>
                    <p style="margin:0;font-size:11px;color:#7A90B0;line-height:1.5;">de empresas en LATAM sufri&oacute; al menos un incidente en 2025</p>
                  </div>
                </td>
                <td style="padding:0 0 0 6px;width:33%;">
                  <div style="background:#091525;border:1px solid #1B2D50;border-radius:10px;padding:18px 14px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#63D89A;">$4.9M</p>
                    <p style="margin:0;font-size:11px;color:#7A90B0;line-height:1.5;">costo promedio global por brecha de datos (IBM 2024)</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- WEBINAR DETAILS CARD -->
        <tr>
          <td style="padding:24px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#091525;border:1px solid #1B2D50;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(90deg,#1A9150 0%,#0E6B3E 100%);padding:12px 20px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#D4FAEB;letter-spacing:.1em;text-transform:uppercase;">Detalles del evento</p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr valign="top">
                      <td style="width:50%;padding-right:16px;border-right:1px solid #1B2D50;">
                        <p style="margin:0 0 10px;font-size:13px;color:#7A90B0;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Fecha y hora</p>
                        <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#F5F7FA;">Mi&eacute;rcoles 9 de septiembre</p>
                        <p style="margin:0 0 2px;font-size:14px;color:#63D89A;font-weight:700;">10:00 AM PT &nbsp;·&nbsp; 12:00 PM CDMX</p>
                        <p style="margin:4px 0 0;font-size:11px;color:#5A7090;">Hora Centro (M&eacute;xico, Ciudad de M&eacute;xico)</p>
                      </td>
                      <td style="width:50%;padding-left:16px;">
                        <p style="margin:0 0 10px;font-size:13px;color:#7A90B0;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Formato</p>
                        <p style="margin:0 0 4px;font-size:14px;color:#F5F7FA;">Duraci&oacute;n: <strong>45 minutos</strong></p>
                        <p style="margin:0 0 4px;font-size:14px;color:#F5F7FA;">Registro: <strong style="color:#63D89A;">Gratuito</strong></p>
                        <p style="margin:4px 0 0;font-size:11px;color:#5A7090;">Grabaci&oacute;n disponible para inscritos</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- TEMAS -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#7A90B0;text-transform:uppercase;letter-spacing:.08em;">Lo que ver&aacute;s en el webinar</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td valign="top" style="width:50%;padding-right:10px;">
                  <p style="margin:0 0 10px;font-size:14px;color:#C8D6E8;line-height:1.6;">
                    <span style="color:#63D89A;font-weight:700;margin-right:6px;">&#10003;</span>C&oacute;mo los grupos de ransomware usan IA generativa para escalar ataques
                  </p>
                  <p style="margin:0 0 10px;font-size:14px;color:#C8D6E8;line-height:1.6;">
                    <span style="color:#63D89A;font-weight:700;margin-right:6px;">&#10003;</span>Principales vectores de amenaza identificados en el reporte 2026
                  </p>
                </td>
                <td valign="top" style="width:50%;padding-left:10px;">
                  <p style="margin:0 0 10px;font-size:14px;color:#C8D6E8;line-height:1.6;">
                    <span style="color:#63D89A;font-weight:700;margin-right:6px;">&#10003;</span>Estrategias de defensa con detecci&oacute;n adaptativa e IA en el endpoint
                  </p>
                  <p style="margin:0 0 10px;font-size:14px;color:#C8D6E8;line-height:1.6;">
                    <span style="color:#63D89A;font-weight:700;margin-right:6px;">&#10003;</span>Casos y estad&iacute;sticas reales del reporte ThreatDown 2026
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
                  <a href="${ctaUrl}" style="display:block;padding:17px 24px;font-size:16px;line-height:1.3;font-weight:700;color:#ffffff;text-decoration:none;">Registrarme al webinar &nbsp;&#8250;</a>
                </td>
              </tr>
            </table>
            <p style="margin:10px 0 16px;text-align:center;font-size:11px;color:#3A5070;">Registro gratuito &nbsp;&#8226;&nbsp; Mi&eacute;rcoles 9 Sep · 12:00 PM CDMX &nbsp;&#8226;&nbsp; 45 minutos</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${reportUrl}" style="display:inline-block;text-decoration:none;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="background:#102044;border:1px solid #1E5C38;border-radius:8px;">
                      <tr valign="middle">
                        <td style="padding:10px 10px 10px 14px;">
                          <img src="${logoSrc}" alt="ThreatDown" style="display:block;width:90px;height:auto;" />
                        </td>
                        <td style="padding:10px 16px 10px 8px;border-left:1px solid #1B2D50;">
                          <p style="margin:0;font-size:13px;font-weight:700;color:#63D89A;white-space:nowrap;">Cybercrime in the Age of AI 2026 &nbsp;&#8250;</p>
                          <p style="margin:2px 0 0;font-size:10px;color:#7A90B0;white-space:nowrap;">Reporte Anual ThreatDown</p>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>
              </tr>
            </table>
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

            <!-- Firmantes: 2 columnas simétricas -->
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

async function sendTest(env) {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no esta configurado en .env.local");
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.RESEND_FROM
    ? `ThreatDown Soluciones <${env.RESEND_FROM}>`
    : FROM_FALLBACK;

  for (const to of TEST_RECIPIENTS) {
    const { data, error } = await resend.emails.send({
      from,
      to,
      reply_to: "salvador.ruiz@synappssys.com",
      subject: `[TEST 4] ${SUBJECT}`,
      html: buildHtml(env, { email: to }),
    });
    if (error) {
      console.error(`Fallo ${to}: ${error.message}`);
    } else {
      console.log(`✅ ${to} — ID: ${data?.id ?? "(sin id)"}`);
    }
  }
}

function buildPreviewFile(env) {
  const html = buildHtml(env, { email: "preview@synappssys.com" });
  const out = "scripts/invite-threatdown-cybercrime-webinar.preview.html";
  writeFileSync(out, html, "utf8");
  console.log(`Preview generado en: ${out}`);
  console.log(`Asunto:   ${SUBJECT}`);
  console.log(`Preheader: ${PREHEADER}`);
  console.log(`CTA URL:  ${WEBINAR_URL}`);
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

  const BATCH = 5;
  const DELAY_MS = 2000;
  const JITTER_MS = 600;
  const results = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
        }).then(({ data, error }) => ({ correo, ok: !error && !!data?.id, id: data?.id, error: error?.message }))
      )
    );
    results.push(...chunkResults);

    const totalSent = results.filter((r) => r.ok).length;
    const totalFailed = results.filter((r) => !r.ok).length;
    const pct = Math.round(((i + chunk.length) / recipients.length) * 100);
    process.stdout.write(`\r  [${pct}%] ${i + chunk.length}/${recipients.length} procesados · ✅ ${totalSent} enviados · ❌ ${totalFailed} fallidos`);

    if (i + BATCH < recipients.length) {
      await sleep(DELAY_MS + Math.random() * JITTER_MS);
    }
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

  const sentDate = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
  const sentList = results.filter((r) => r.ok).map((r) => r.correo);

  await resend.emails.send({
    from,
    to: ["ecotae0@gmail.com", "ecota@threatdown.com", "salvador.ruiz@synappssys.com"],
    subject: `[Reporte Webinar] ${sent} enviados · ${sentDate}`,
    html: `<table style="font-family:Arial,sans-serif;max-width:600px;border:1px solid #1B2D50;border-radius:8px;overflow:hidden">
      <tr><td style="background:#0D1B3E;padding:16px 24px;color:#63D89A;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Reporte · Campaña Cybercrime Webinar Sep 9</td></tr>
      <tr><td style="padding:20px 24px;font-family:Arial,sans-serif;font-size:13px;color:#334155">
        <p style="margin:0 0 6px"><strong>Fecha:</strong> ${sentDate}</p>
        <p style="margin:0 0 6px"><strong>Asunto:</strong> ${SUBJECT}</p>
        <p style="margin:0 0 16px"><strong>Fuentes:</strong> BD + Excel Cota + Excel ISEC 2026</p>
        <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
          <tr style="background:#f1f5f9">
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#0f172a">✅ Enviados</td>
            <td style="padding:10px 14px;font-size:26px;font-weight:800;color:#16a34a">${sent}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#0f172a">❌ Fallidos</td>
            <td style="padding:10px 14px;font-size:26px;font-weight:800;color:#dc2626">${failed.length}</td>
          </tr>
        </table>
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.05em">Lista de enviados exitosos (${sentList.length}):</p>
        <p style="margin:0 0 20px;font-size:11px;color:#475569;line-height:1.9;">${sentList.join("<br>")}</p>
        ${failed.length > 0 ? `<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.05em">Fallidos (${failed.length}):</p><p style="margin:0;font-size:11px;color:#dc2626;line-height:1.9;">${failed.map(f=>f.correo).join("<br>")}</p>` : ""}
      </td></tr>
    </table>`,
  });

  console.log("Reporte enviado a ecotae0@gmail.com, ecota@threatdown.com y salvador.ruiz@synappssys.com");
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
