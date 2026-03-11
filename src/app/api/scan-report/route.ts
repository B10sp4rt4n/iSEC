/**
 * POST /api/scan-report
 *
 * Endpoint INTERNO — solo debe ser llamado por /api/prospects usando el header
 * X-Internal-Secret con el valor de SCAN_REPORT_SECRET.
 *
 * Flujo:
 *  1. Recibe datos del prospecto
 *  2. Consulta DNS público (SPF, DMARC, MX/gateway)
 *  3. Calcula score de exposición y postura
 *  4. Llama a OpenAI para generar párrafo ejecutivo personalizado
 *  5. Envía correo de reporte vía Resend
 */

import { NextResponse } from "next/server";
import { promises as dnsPromises } from "dns";
import OpenAI from "openai";
import { Resend } from "resend";
import { z } from "zod";

// ─── Validación del body ───────────────────────────────────────────────────
const bodySchema = z.object({
  nombre: z.string(),
  empresa: z.string(),
  cargo: z.string(),
  correo: z.string().email(),
  dolor_reto: z.string(),
});

// ─── Mapeo legible de cargo ────────────────────────────────────────────────
const CARGO_LABEL: Record<string, string> = {
  ciso: "CISO",
  cio_cto: "CIO / CTO",
  director_ops: "Director de Operaciones",
  director_gral: "Director General",
  gerente_ti: "Gerente de TI",
  gerente_seguridad: "Gerente de Seguridad",
  jefe_ti: "Jefe de TI",
  admin_sistemas: "Administrador de Sistemas",
  ingeniero_seguridad: "Ingeniero de Seguridad",
  analista_ti: "Analista de TI",
  reseller: "Reseller / Canal",
  otro: "Otro",
};

// ─── DNS: SPF ──────────────────────────────────────────────────────────────
async function checkSpf(domain: string): Promise<{ found: boolean; record: string }> {
  try {
    const records = await dnsPromises.resolveTxt(domain);
    const spf = records.flat().find((r) => r.startsWith("v=spf1"));
    return spf ? { found: true, record: spf } : { found: false, record: "" };
  } catch {
    return { found: false, record: "" };
  }
}

// ─── DNS: DMARC ────────────────────────────────────────────────────────────
async function checkDmarc(
  domain: string,
): Promise<{ found: boolean; policy: string; record: string }> {
  try {
    const records = await dnsPromises.resolveTxt(`_dmarc.${domain}`);
    const dmarc = records.flat().find((r) => r.startsWith("v=DMARC1"));
    if (!dmarc) return { found: false, policy: "none", record: "" };
    const pMatch = dmarc.match(/p=([^;]+)/i);
    const policy = pMatch ? pMatch[1].toLowerCase().trim() : "none";
    return { found: true, policy, record: dmarc };
  } catch {
    return { found: false, policy: "none", record: "" };
  }
}

// ─── DNS: Gateway / vendor de correo via MX ────────────────────────────────
const GATEWAY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /google|gmail/i, label: "Google Workspace" },
  { pattern: /outlook|microsoft|office365|protection\.outlook/i, label: "Microsoft 365" },
  { pattern: /mimecast/i, label: "Mimecast" },
  { pattern: /proofpoint/i, label: "Proofpoint" },
  { pattern: /barracuda/i, label: "Barracuda" },
  { pattern: /ironport|cisco/i, label: "Cisco IronPort" },
  { pattern: /fortimail|fortiguard/i, label: "FortiMail" },
  { pattern: /sophos/i, label: "Sophos" },
  { pattern: /trendmicro|trend\.micro|imhs\.trendmicro/i, label: "Trend Micro" },
  { pattern: /spamexperts/i, label: "SpamExperts" },
  { pattern: /messagelabs|symantec/i, label: "Symantec MessageLabs" },
];

async function detectGateway(domain: string): Promise<string | null> {
  try {
    const mxRecords = await dnsPromises.resolveMx(domain);
    const mx = mxRecords.sort((a, b) => a.priority - b.priority)[0]?.exchange ?? "";
    for (const { pattern, label } of GATEWAY_PATTERNS) {
      if (pattern.test(mx)) return label;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Score y postura ───────────────────────────────────────────────────────
interface ScanResult {
  spf: boolean;
  dmarc: boolean;
  dmarcPolicy: string;
  gateway: string | null;
  score: number;
  postura: "Avanzada" | "Intermedia" | "Básica";
}

function calcScore(spf: boolean, dmarc: boolean, policy: string, gateway: string | null): number {
  let s = 50;
  s += spf ? 10 : -5;
  s += dmarc ? 15 : -5;
  if (dmarc) {
    if (policy === "reject" || policy === "quarantine") s += 10;
    else if (policy === "none") s += 5;
  }
  if (gateway) s += 10;
  return Math.max(0, Math.min(100, s));
}

function getPostura(
  spf: boolean,
  dmarc: boolean,
  policy: string,
  gateway: string | null,
): "Avanzada" | "Intermedia" | "Básica" {
  if (spf && dmarc && (policy === "reject" || policy === "quarantine") && gateway) return "Avanzada";
  if (spf && dmarc) return "Intermedia";
  return "Básica";
}

// ─── Colores de postura para el badge ─────────────────────────────────────
const POSTURA_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Avanzada: { bg: "#dcfce7", color: "#15803d", border: "#86efac" },
  Intermedia: { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
  Básica: { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
};

// ─── Template HTML del correo ──────────────────────────────────────────────
function buildEmailHtml(
  nombre: string,
  empresa: string,
  cargo: string,
  domain: string,
  scan: ScanResult,
  aiParagraph: string,
): string {
  const ps = POSTURA_STYLE[scan.postura] ?? POSTURA_STYLE["Básica"];
  const cargoLabel = CARGO_LABEL[cargo] ?? cargo;

  const checkIcon = (ok: boolean) =>
    ok
      ? `<span style="color:#16a34a;font-weight:700">✔ Activo</span>`
      : `<span style="color:#dc2626;font-weight:700">✘ No detectado</span>`;

  const policyTag = scan.dmarc
    ? `<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px">${scan.dmarcPolicy}</code>`
    : `<span style="color:#9ca3af;font-size:12px">N/A</span>`;

  const gatewayTag = scan.gateway
    ? `<span style="color:#16a34a;font-weight:700">✔ ${scan.gateway}</span>`
    : `<span style="color:#dc2626;font-weight:700">✘ No detectado</span>`;

  // Score bar width
  const barW = `${scan.score}%`;
  const barColor =
    scan.score >= 70 ? "#16a34a" : scan.score >= 45 ? "#ca8a04" : "#dc2626";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;
                    box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:96vw">

        <!-- ── Header ── -->
        <tr>
          <td style="background:#162036;padding:28px 36px">
            <div style="display:inline-block;background:#ffffff;border-radius:8px;
                        padding:8px 16px;margin-bottom:20px">
              <img src="https://registro.synappssys.com/logos/threatdown-logo.png"
                   alt="ThreatDown by Malwarebytes" height="32"
                   style="display:block" />
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.3">
              Reporte de Exposición DNS
            </h1>
            <p style="margin:6px 0 0;color:#94a3b8;font-size:13px">${domain}</p>
          </td>
        </tr>

        <!-- ── Saludo ── -->
        <tr>
          <td style="padding:28px 36px 0">
            <p style="margin:0;font-size:15px;color:#1e293b">
              Hola, <strong>${nombre}</strong> — ${cargoLabel} en <strong>${empresa}</strong>
            </p>
            <p style="margin:12px 0 0;font-size:14px;color:#475569;line-height:1.6">
              Analizamos los registros DNS públicos de tu dominio y preparamos este
              resumen ejecutivo de seguridad de correo electrónico.
            </p>
          </td>
        </tr>

        <!-- ── Postura + Score ── -->
        <tr>
          <td style="padding:24px 36px 0">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Postura badge -->
                <td width="48%" style="vertical-align:top">
                  <div style="background:${ps.bg};border:1px solid ${ps.border};
                              border-radius:10px;padding:18px 20px;text-align:center">
                    <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;
                               letter-spacing:.05em;font-weight:600">Postura de Seguridad</p>
                    <p style="margin:8px 0 0;font-size:26px;font-weight:800;color:${ps.color}">
                      ${scan.postura}
                    </p>
                  </div>
                </td>
                <td width="4%"></td>
                <!-- Score -->
                <td width="48%" style="vertical-align:top">
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;
                              border-radius:10px;padding:18px 20px;text-align:center">
                    <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;
                               letter-spacing:.05em;font-weight:600">Score de Exposición</p>
                    <p style="margin:8px 0 4px;font-size:26px;font-weight:800;color:#162036">
                      ${scan.score}<span style="font-size:14px;color:#94a3b8">/100</span>
                    </p>
                    <!-- barra de progreso -->
                    <div style="background:#e2e8f0;border-radius:9999px;height:6px;margin-top:8px">
                      <div style="background:${barColor};width:${barW};height:6px;
                                  border-radius:9999px"></div>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Controles detectados ── -->
        <tr>
          <td style="padding:24px 36px 0">
            <h2 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#162036;
                        text-transform:uppercase;letter-spacing:.05em">
              Controles detectados
            </h2>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;
                          font-size:13px">
              <thead>
                <tr style="background:#f1f5f9">
                  <th style="padding:10px 14px;text-align:left;color:#64748b;font-weight:600">Control</th>
                  <th style="padding:10px 14px;text-align:left;color:#64748b;font-weight:600">Estado</th>
                  <th style="padding:10px 14px;text-align:left;color:#64748b;font-weight:600">Detalle</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-top:1px solid #e2e8f0">
                  <td style="padding:10px 14px;color:#1e293b;font-weight:600">SPF</td>
                  <td style="padding:10px 14px">${checkIcon(scan.spf)}</td>
                  <td style="padding:10px 14px;color:#64748b;font-size:12px">
                    ${scan.spf ? "Registro v=spf1 encontrado" : "Sin política de remitentes autorizados"}
                  </td>
                </tr>
                <tr style="border-top:1px solid #e2e8f0;background:#fafafa">
                  <td style="padding:10px 14px;color:#1e293b;font-weight:600">DMARC</td>
                  <td style="padding:10px 14px">${checkIcon(scan.dmarc)}</td>
                  <td style="padding:10px 14px;color:#64748b;font-size:12px">
                    ${scan.dmarc ? "Registro v=DMARC1 encontrado" : "Sin política de autenticación de correo"}
                  </td>
                </tr>
                <tr style="border-top:1px solid #e2e8f0">
                  <td style="padding:10px 14px;color:#1e293b;font-weight:600">Política DMARC</td>
                  <td style="padding:10px 14px">${policyTag}</td>
                  <td style="padding:10px 14px;color:#64748b;font-size:12px">
                    ${
                      scan.dmarcPolicy === "reject"
                        ? "Máxima protección — correos no autenticados rechazados"
                        : scan.dmarcPolicy === "quarantine"
                          ? "Protección media — correos van a spam"
                          : scan.dmarc
                            ? "Política p=none — solo monitoreo, sin bloqueo"
                            : "No aplica"
                    }
                  </td>
                </tr>
                <tr style="border-top:1px solid #e2e8f0;background:#fafafa">
                  <td style="padding:10px 14px;color:#1e293b;font-weight:600">Gateway de correo</td>
                  <td style="padding:10px 14px">${gatewayTag}</td>
                  <td style="padding:10px 14px;color:#64748b;font-size:12px">
                    ${scan.gateway ? "Solución de filtrado detectada vía MX" : "Sin gateway de seguridad identificado"}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        <!-- ── Análisis IA ── -->
        <tr>
          <td style="padding:24px 36px 0">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 22px">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#1d4ed8;
                         text-transform:uppercase;letter-spacing:.05em">
                🤖 Análisis ejecutivo (generado con IA)
              </p>
              <p style="margin:0;font-size:14px;color:#1e3a5f;line-height:1.7">
                ${aiParagraph}
              </p>
            </div>
          </td>
        </tr>

        <!-- ── CTA ── -->
        <tr>
          <td style="padding:28px 36px 0;text-align:center">
            <a href="https://registro.synappssys.com"
               style="display:inline-block;background:#162036;color:#ffffff;
                      font-size:14px;font-weight:700;padding:14px 32px;
                      border-radius:8px;text-decoration:none;letter-spacing:.02em">
              Habla con un especialista →
            </a>
          </td>
        </tr>

        <!-- ── Disclaimer ── -->
        <tr>
          <td style="padding:24px 36px 32px">
            <div style="background:#fafafa;border:1px solid #e2e8f0;border-left:4px solid #f59e0b;
                        border-radius:6px;padding:16px 18px;margin-top:8px">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#92400e;
                         text-transform:uppercase;letter-spacing:.05em">
                ⚠️ Aviso importante — Disclaimer
              </p>
              <p style="margin:0;font-size:11px;color:#78716c;line-height:1.6">
                Este análisis se basa <strong>exclusivamente en registros DNS públicos</strong>
                y <strong>no constituye una auditoría de seguridad formal</strong>.
                Los resultados reflejan el estado observable del dominio al momento del análisis
                y pueden no representar la totalidad de los controles de seguridad implementados
                en su organización. El score y la postura son estimaciones orientativas; factores
                internos como firewall, EDR, MFA o políticas internas no están contemplados.
                <strong>SynAppsSys no garantiza la exhaustividad ni exactitud absoluta de los
                datos.</strong> Para una evaluación completa de su postura de seguridad,
                le recomendamos contactar a un especialista certificado.
              </p>
            </div>

            <!-- Footer -->
            <div style="margin-top:24px;text-align:center">
              <img src="https://registro.synappssys.com/logos/synappssys-logo.png"
                   alt="SynAppsSys" height="36"
                   style="display:inline-block;margin-bottom:8px" />
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6">
                Este mensaje fue generado automáticamente por <strong>SynAppsSys</strong> • iSEC Infosecurity<br>
                Si no te registraste en nuestro evento, ignora este correo o contáctanos.
              </p>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Handler ───────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  // Autenticación interna
  const secret = process.env.SCAN_REPORT_SECRET;
  const incoming = request.headers.get("x-internal-secret");
  if (!secret || !incoming || incoming !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    body = bodySchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { nombre, empresa, cargo, correo, dolor_reto } = body;
  const domain = correo.split("@")[1].toLowerCase();

  // 1. DNS scan en paralelo
  const [spfResult, dmarcResult, gateway] = await Promise.all([
    checkSpf(domain),
    checkDmarc(domain),
    detectGateway(domain),
  ]);

  const scan: ScanResult = {
    spf: spfResult.found,
    dmarc: dmarcResult.found,
    dmarcPolicy: dmarcResult.policy,
    gateway,
    score: calcScore(spfResult.found, dmarcResult.found, dmarcResult.policy, gateway),
    postura: getPostura(spfResult.found, dmarcResult.found, dmarcResult.policy, gateway),
  };

  // 2. OpenAI — párrafo ejecutivo
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error("[scan-report] OPENAI_API_KEY no configurado");
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 500 });
  }

  const cargoLabel = CARGO_LABEL[cargo] ?? cargo;
  const openai = new OpenAI({ apiKey: openaiKey });

  let aiParagraph = "";
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 250,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Eres un consultor senior de ciberseguridad de SynAppsSys. " +
            "Escribes en español formal, de forma concisa y orientada a riesgos de negocio. " +
            "Nunca uses jerga excesivamente técnica. Tu audiencia son directivos y tomadores de decisiones.",
        },
        {
          role: "user",
          content:
            `Prospecto: ${nombre}, ${cargoLabel} en ${empresa}.\n` +
            `Su principal reto de seguridad: ${dolor_reto}\n\n` +
            `Análisis DNS del dominio ${domain}:\n` +
            `- SPF: ${scan.spf ? "encontrado" : "NO encontrado"}\n` +
            `- DMARC: ${scan.dmarc ? "encontrado" : "NO encontrado"}, política: ${scan.dmarcPolicy}\n` +
            `- Gateway de correo: ${scan.gateway ?? "no detectado"}\n` +
            `- Score de exposición: ${scan.score}/100\n` +
            `- Postura: ${scan.postura}\n\n` +
            "Redacta UN párrafo ejecutivo de 3 a 4 oraciones dirigido directamente a este tomador de decisiones. " +
            "Explica brevemente qué riesgos representan las brechas encontradas para su negocio " +
            "y menciona que ThreatDown by Malwarebytes, junto con SynAppsSys, puede ayudarle a cerrarlas. " +
            "Sé directo y no uses frases genéricas. No repitas el score ni los datos técnicos.",
        },
      ],
    });
    aiParagraph = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("[scan-report] OpenAI error:", err);
    aiParagraph =
      "Basado en el análisis de su dominio, identificamos áreas de mejora en su postura de seguridad de correo electrónico. " +
      "Le recomendamos hablar con un especialista de SynAppsSys para revisar las brechas detectadas " +
      "y conocer cómo ThreatDown by Malwarebytes puede fortalecer su protección.";
  }

  // 3. Enviar correo
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("[scan-report] RESEND_API_KEY no configurado");
    return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  const fromDomain = process.env.RESEND_FROM ?? "no-reply@send.synappssys.com";

  const { error: sendError } = await resend.emails.send({
    from: `SynAppsSys Security <${fromDomain}>`,
    to: correo,
    subject: `Reporte de exposición DNS — ${domain}`,
    html: buildEmailHtml(nombre, empresa, cargo, domain, scan, aiParagraph),
  });

  if (sendError) {
    console.error("[scan-report] Resend send error:", sendError);
    return NextResponse.json({ error: "Email send failed", detail: sendError }, { status: 500 });
  }

  return NextResponse.json({ ok: true, score: scan.score, postura: scan.postura });
}
