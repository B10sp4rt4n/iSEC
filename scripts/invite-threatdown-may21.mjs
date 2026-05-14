import { readFileSync, writeFileSync } from "fs";
import { Resend } from "resend";

const SUBJECT = "Cierra la brecha despues del login: invitacion ThreatDown ITDR";
const PREHEADER = "Jueves 21 de mayo de 2026, 9:00 a.m. hora CDMX (10:00 a.m. CT).";
const TEST_RECIPIENT = "sruiz@synappssys.com";
const FROM_FALLBACK = "iSEC Infosecurity <no-reply@send.synappssys.com>";
const MEETING_URL = process.env.THREATDOWN_INVITE_URL || "REPLACE_WITH_MEETING_URL";
const TRACKING_BASE_URL = process.env.THREATDOWN_TRACKING_BASE_URL || "REPLACE_WITH_TRACKING_BASE_URL";
const CAMPAIGN_KEY = "threatdown_may21_2026";
const PDF_PATH = "ITDR ThreatDown.pdf";
const THREATDOWN_LOGO_PATH = "/logos/ThreatDown_2.0_Stacked_Reverse.png";
const PARTNER_LOGO_PATH = "/logos/LOGO%20SynAppsSys%202026.jpg";
const EVENT_DATE_LABEL = "Jueves, 21 de mayo de 2026";
const EVENT_TIME_LABEL = "9:00 a.m. CDMX (10:00 a.m. CT, US)";

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

function getSiteUrl() {
  const localEnv = loadEnvLocal();
  return (
    process.env.URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    localEnv.URL ??
    localEnv.NEXT_PUBLIC_SITE_URL ??
    ""
  );
}

function buildPublicUrl(pathname) {
  return new URL(pathname, getSiteUrl()).toString();
}

function buildTrackedUrl(email, nombre) {
  if (MEETING_URL === "REPLACE_WITH_MEETING_URL") {
    return MEETING_URL;
  }

  if (TRACKING_BASE_URL === "REPLACE_WITH_TRACKING_BASE_URL") {
    return MEETING_URL;
  }

  const cleanBase = TRACKING_BASE_URL.replace(/\/$/, "");
  const params = new URLSearchParams({
    campaign: CAMPAIGN_KEY,
    target: MEETING_URL,
    email,
    nombre,
  });
  return `${cleanBase}/api/campaign2/click?${params.toString()}`;
}

function buildHtml({ nombre, email }) {
  const ctaUrl = buildTrackedUrl(email, nombre);
  const logoSrc = buildPublicUrl(THREATDOWN_LOGO_PATH);
  const partnerLogoSrc = buildPublicUrl(PARTNER_LOGO_PATH);
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#050a1f;font-family:Arial,Helvetica,sans-serif;color:#e5ebff;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${PREHEADER}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:radial-gradient(circle at 10% 0%, #0b1f52 0%, #050a1f 45%, #040814 100%);padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#070f2d;border:1px solid #2f4fd1;border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px rgba(84,127,255,.25),0 18px 44px rgba(0,0,0,.38);">
          <tr>
            <td style="padding:24px 24px 10px 24px;text-align:center;background:linear-gradient(135deg,#0b183d 0%,#0a1240 60%,#1b0f4a 100%);border-bottom:1px solid rgba(84,127,255,.35);">
              <img src="${logoSrc}" alt="ThreatDown" style="display:block;margin:0 auto 14px;max-width:240px;width:100%;height:auto;" />
              <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8ad3ff;font-weight:700;">ThreatDown ITDR | Invitacion ejecutiva</p>
              <h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;color:#f4f7ff;">La amenaza ya no entra, inicia sesion</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px 8px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#081336;border:1px solid #2642b8;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px;font-size:13px;color:#8db0ff;font-weight:700;letter-spacing:.03em;text-transform:uppercase;">Invitacion</p>
                    <p style="margin:0;font-size:20px;line-height:1.35;color:#ffffff;font-weight:700;">${EVENT_DATE_LABEL}</p>
                    <p style="margin:8px 0 0;font-size:16px;line-height:1.45;color:#d8e5ff;">${EVENT_TIME_LABEL}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 24px 4px 24px;">
              <p style="margin:0;font-size:16px;line-height:1.7;color:#dce7ff;">Hola ${nombre},<br />
              Muchos ataques hoy comienzan con credenciales validas. En esta sesion veremos como ThreatDown ITDR ayuda a detectar actividad sospechosa despues de la autenticacion y a responder antes de que escale.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 10px;">
                      <tr>
                        <td style="background:#081336;border:1px solid #2b4cc8;border-radius:10px;padding:12px 14px;">
                          <p style="margin:0;font-size:14px;color:#f5f7ff;font-weight:700;">Monitoreo continuo de AD, Entra ID y Okta</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#081336;border:1px solid #2b4cc8;border-radius:10px;padding:12px 14px;">
                          <p style="margin:0;font-size:14px;color:#f5f7ff;font-weight:700;">Correlacion automatica entre identidad y endpoint</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#081336;border:1px solid #2b4cc8;border-radius:10px;padding:12px 14px;">
                          <p style="margin:0;font-size:14px;color:#f5f7ff;font-weight:700;">Contencion automatizada en segundos</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 0 24px;">
              <p style="margin:0 0 10px;font-size:14px;color:#b6cbff;">Beneficios para tu equipo:</p>
              <p style="margin:0;font-size:14px;line-height:1.8;color:#e6eeff;">Mas visibilidad post-login | Menos complejidad operativa | Sin herramientas desconectadas</p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 24px 8px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="border-radius:12px;background:linear-gradient(90deg,#2f68ff 0%,#8a4dff 100%);box-shadow:0 10px 24px rgba(71,92,255,.35);">
                    <a href="${ctaUrl}" style="display:block;padding:16px 18px;font-size:21px;line-height:1.2;font-weight:700;color:#ffffff;text-decoration:none;">Registrate al evento | Jue 21 mayo</a>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0;text-align:center;font-size:12px;color:#92a8e6;">Ideal para organizaciones con Microsoft 365, AD u Okta.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px 24px 24px;border-top:1px solid rgba(95,126,239,.35);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 12px 0;">
                    <img src="${partnerLogoSrc}" alt="SynAppsSys" style="display:block;margin:0 auto;max-width:180px;width:100%;height:auto;" />
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#a6b9ec;line-height:1.7;text-align:center;">[Tu nombre] | [Empresa] | [Datos de contacto]</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendTest(env) {
  if (MEETING_URL === "REPLACE_WITH_MEETING_URL") {
    throw new Error("Define THREATDOWN_INVITE_URL en .env.local antes de enviar la prueba.");
  }

  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no esta configurado en .env.local");
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.RESEND_FROM
    ? `iSEC Infosecurity <${env.RESEND_FROM}>`
    : FROM_FALLBACK;
  const pdfContent = readFileSync(PDF_PATH);

  const { data, error } = await resend.emails.send({
    from,
    to: TEST_RECIPIENT,
    subject: `[TEST] ${SUBJECT}`,
    html: buildHtml({ nombre: "Salvador", email: TEST_RECIPIENT }),
    attachments: [
      {
        filename: "ITDR ThreatDown.pdf",
        content: pdfContent,
      },
    ],
  });

  if (error) {
    throw new Error(`Fallo el envio de prueba: ${error.message}`);
  }

  console.log("Prueba enviada correctamente.");
  console.log(`Email ID: ${data?.id ?? "(sin id)"}`);
  console.log(`Destino: ${TEST_RECIPIENT}`);
}

function buildPreviewFile() {
  const html = buildHtml({ nombre: "[Nombre]", email: "preview@synappssys.com" });
  const out = "scripts/invite-threatdown-may21.preview.html";
  writeFileSync(out, html, "utf8");
  console.log(`Preview generado en: ${out}`);
  console.log(`Asunto: ${SUBJECT}`);
  console.log(`Preheader: ${PREHEADER}`);
  if (MEETING_URL === "REPLACE_WITH_MEETING_URL") {
    console.log("Aviso: falta definir THREATDOWN_INVITE_URL en .env.local");
  } else {
    console.log(`Liga CTA: ${MEETING_URL}`);
  }
  if (TRACKING_BASE_URL === "REPLACE_WITH_TRACKING_BASE_URL") {
    console.log("Aviso: falta definir THREATDOWN_TRACKING_BASE_URL para medir clics (conteo y quien).\nActualmente el CTA usa la liga directa del evento.");
  } else {
    console.log(`Tracking base: ${TRACKING_BASE_URL}`);
  }
}

async function main() {
  const env = loadEnvLocal();
  const shouldSend = process.argv.includes("--send-test");

  if (shouldSend) {
    await sendTest(env);
    return;
  }

  buildPreviewFile();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
