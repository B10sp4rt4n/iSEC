import { NextResponse } from "next/server";
import { z } from "zod";
import { promises as dns } from "dns";
import { Resend } from "resend";
import { ensureEventSchema, getSqlClient } from "@/lib/db";

// GET /api/prospects — lista todos los prospectos (requiere x-admin-key)
export async function GET(request: Request) {
  const adminKey = process.env.RAFFLE_ADMIN_KEY;
  if (!adminKey || request.headers.get("x-admin-key") !== adminKey) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const sql = getSqlClient();
    await ensureEventSchema(sql);

    const rows = await sql`
      SELECT
        id,
        folio,
        nombre,
        empresa,
        cargo,
        correo,
        telefono,
        pregunta_cerrada_1,
        pregunta_cerrada_2,
        dolor_reto,
        created_at
      FROM event_prospects
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ ok: true, prospects: rows }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[GET /api/prospects]", err);
    return NextResponse.json({ error: "Error al obtener prospectos." }, { status: 500 });
  }
}

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
  contexto_orbita: z.string().trim().max(200).optional().or(z.literal("")),
  acepta_comunicaciones: z.boolean().optional().default(false),
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
        dolor_reto,
        contexto_orbita,
        acepta_comunicaciones
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
        ${parsed.data.dolor_reto},
        ${parsed.data.contexto_orbita || null},
        ${parsed.data.acepta_comunicaciones ?? false}
      )
      RETURNING id, folio;
    `;

    const inserted = Array.isArray(result) ? result[0] : null;
    const folio = inserted?.folio ? String(inserted.folio).padStart(4, "0") : "—";

    // ── Assessment DNS del dominio del prospecto ─────────────────────────────
    // Se resuelve aquí porque el dominio ya fue validado (MX existe).
    // Se usa para enriquecer el correo de confirmación.
    const dnsAssessment = await (async () => {
      type DnsResult = {
        hasMx: boolean; mxRecord: string;
        hasSPF: boolean; spfRecord: string;
        hasDMARC: boolean; dmarcRecord: string;
        score: number; scoreLabel: string; scoreColor: string;
      };
      const result: DnsResult = {
        hasMx: false, mxRecord: "",
        hasSPF: false, spfRecord: "",
        hasDMARC: false, dmarcRecord: "",
        score: 0, scoreLabel: "Crítico", scoreColor: "#dc2626",
      };
      try {
        // MX (ya validado antes, pero lo traemos para mostrar)
        const mxRecords = await dns.resolveMx(domain).catch(() => []);
        if (mxRecords.length > 0) {
          result.hasMx = true;
          result.mxRecord = mxRecords.sort((a: { priority: number; exchange: string }, b: { priority: number; exchange: string }) => a.priority - b.priority)[0].exchange;
        }
        // SPF — TXT record en el apex que empieza con "v=spf1"
        const txtRecords = await dns.resolveTxt(domain).catch(() => [] as string[][]);
        const spfTxt = txtRecords.flat().find((r: string) => r.toLowerCase().startsWith("v=spf1"));
        if (spfTxt) { result.hasSPF = true; result.spfRecord = spfTxt.slice(0, 80); }
        // DMARC — TXT en _dmarc.<domain>
        const dmarcTxt = await dns.resolveTxt(`_dmarc.${domain}`).catch(() => [] as string[][]);
        const dmarcRec = dmarcTxt.flat().find((r: string) => r.toLowerCase().startsWith("v=dmarc1"));
        if (dmarcRec) { result.hasDMARC = true; result.dmarcRecord = dmarcRec.slice(0, 120); }
      } catch { /* silencioso */ }
      // Score: MX=1pt, SPF=1pt, DMARC=1pt → 0-3
      result.score = (result.hasMx ? 1 : 0) + (result.hasSPF ? 1 : 0) + (result.hasDMARC ? 1 : 0);
      if (result.score === 3) { result.scoreLabel = "Protegido"; result.scoreColor = "#16a34a"; }
      else if (result.score === 2) { result.scoreLabel = "Riesgo medio"; result.scoreColor = "#d97706"; }
      else { result.scoreLabel = "Riesgo alto"; result.scoreColor = "#dc2626"; }
      return result;
    })();

    const dnsHtml = (() => {
      const row = (ok: boolean, label: string, detail: string) => `
        <tr>
          <td style="padding:10px 12px;vertical-align:top">
            <span style="display:inline-flex;align-items:center;justify-content:center;
                         width:20px;height:20px;border-radius:50%;font-size:11px;font-weight:800;
                         background:${ok ? "#dcfce7" : "#fee2e2"};color:${ok ? "#15803d" : "#b91c1c"}">
              ${ok ? "✓" : "✗"}
            </span>
          </td>
          <td style="padding:10px 0;vertical-align:top">
            <span style="font-size:13px;font-weight:700;color:#162036">${label}</span>
            ${detail ? `<div style="font-size:11px;color:#94a3b8;margin-top:3px;font-family:monospace;word-break:break-all">${detail}</div>` : ""}
          </td>
          <td style="padding:10px 12px;text-align:right;vertical-align:top">
            <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;
                         background:${ok ? "#f0fdf4" : "#fef2f2"};color:${ok ? "#15803d" : "#dc2626"}">
              ${ok ? "OK" : "FALTA"}
            </span>
          </td>
        </tr>`;
      const total = dnsAssessment.score;
      const pct = Math.round((total / 3) * 100);
      return `
        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:0 0 24px">
          <!-- Header del assessment -->
          <div style="background:#0f172a;padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em">
                DNS Security Assessment
              </p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#ffffff;font-family:monospace">
                ${domain}
              </p>
            </div>
            <div style="text-align:right">
              <p style="margin:0;font-size:28px;font-weight:900;color:${dnsAssessment.scoreColor};line-height:1">${pct}%</p>
              <p style="margin:2px 0 0;font-size:11px;font-weight:700;color:${dnsAssessment.scoreColor}">${dnsAssessment.scoreLabel}</p>
            </div>
          </div>
          <!-- Barra de progreso -->
          <div style="height:4px;background:#1e293b">
            <div style="height:4px;width:${pct}%;background:${dnsAssessment.scoreColor};transition:width .3s"></div>
          </div>
          <!-- Checks -->
          <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0">
              <td colspan="3" style="padding:8px 12px;font-size:11px;font-weight:700;
                  color:#64748b;text-transform:uppercase;letter-spacing:.06em">
                Registros evaluados
              </td>
            </tr>
            ${row(dnsAssessment.hasMx, "Registro MX (recepción de correo)", dnsAssessment.mxRecord)}
            <tr><td colspan="3" style="border-top:1px solid #f1f5f9"></td></tr>
            ${row(dnsAssessment.hasSPF, "SPF (autorización de remitentes)", dnsAssessment.spfRecord)}
            <tr><td colspan="3" style="border-top:1px solid #f1f5f9"></td></tr>
            ${row(dnsAssessment.hasDMARC, "DMARC (política antiphishing)", dnsAssessment.dmarcRecord)}
          </table>
          ${total < 3 ? `
          <!-- Recomendación -->
          <div style="background:#fffbeb;border-top:1px solid #fde68a;padding:12px 20px">
            <p style="margin:0;font-size:12px;color:#92400e;line-height:1.5">
              <strong>⚠️ ${3 - total} ${3 - total === 1 ? "control faltante" : "controles faltantes"}:</strong>
              ${!dnsAssessment.hasSPF && !dnsAssessment.hasDMARC
                ? "Sin SPF ni DMARC, cualquier atacante puede enviar correos que parecen ser de <strong>@" + domain + "</strong>."
                : !dnsAssessment.hasDMARC
                ? "Sin DMARC, el SPF no puede aplicar política de rechazo sobre correos falsificados."
                : "Sin SPF, no hay lista de servidores autorizados para enviar en nombre de tu dominio."}
            </p>
          </div>` : `
          <div style="background:#f0fdf4;border-top:1px solid #bbf7d0;padding:12px 20px">
            <p style="margin:0;font-size:12px;color:#166534;line-height:1.5">
              ✅ Tu dominio tiene los tres controles básicos activos. Agenda con SynAppsSys para revisar la configuración a fondo.
            </p>
          </div>`}
        </div>`;
    })();

    // Correo de confirmación (no bloqueante — si falla no afecta el registro)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const fromDomain = process.env.RESEND_FROM ?? "analisis@send.synappssys.com";

      // Personalización por frente/escenario
      const contexto = parsed.data.contexto_orbita ?? "";
      const [fronteId, escenario] = contexto.split("|");

      type FrenteInfo = {
        nombre: string; color: string;
        subject: string;        // consultivo, ligado al escenario
        intro: string;          // 1ª frase del email
        casoTitulo: string;     // título del caso de impacto real
        casoTexto: string;      // narrativa del caso (2-3 líneas)
        casoUrl: string;        // link al caso/blog ThreatDown
        ctaTexto: string;       // texto del botón assessment
        newsQuery: string;      // query para buscar noticia dinámica
        datasheet: string; dsLabel: string;
      };

      const FRENTE_INFO: Record<string, FrenteInfo> = {
        equipo: {
          nombre: "Endpoints", color: "#E4512E",
          subject: `${escenario || "Equipo infectado"}: así se detiene antes de propagarse`,
          intro: "Viste cómo un endpoint comprometido puede paralizar una operación entera. No es un escenario hipotético.",
          casoTitulo: "Caso real: ransomware detenido en 8 segundos",
          casoTexto: "Una empresa manufacturera con 200 equipos sufrió una infección de LockBit. ThreatDown EDR aisló el equipo afectado automáticamente antes de que el ransomware llegara a compartir red. Cero archivos cifrados en el resto de la organización.",
          casoUrl: "https://www.threatdown.com/resources/case-studies/",
          ctaTexto: "Evalúa tus endpoints con SynAppsSys →",
          newsQuery: "ransomware empresas México 2026 endpoint ataque",
          datasheet: "https://www.threatdown.com/wp-content/uploads/2024/04/TD_EDR_Datasheet_v2.pdf",
          dsLabel: "ThreatDown EDR — Datasheet",
        },
        identidad: {
          nombre: "Identidad y Accesos", color: "#7C3AED",
          subject: `${escenario || "Credencial comprometida"}: una cuenta robada puede costar millones`,
          intro: "El 80% de las brechas empieza con una credencial comprometida. Lo que viste en la órbita pasa todos los días.",
          casoTitulo: "Caso real: acceso anómalo detectado a las 2 AM",
          casoTexto: "Un director financiero de una firma de servicios tuvo su cuenta de Microsoft 365 usada desde Ucrania fuera de horario. ThreatDown detectó el comportamiento inusual, bloqueó la sesión y notificó al equipo de TI en menos de 3 minutos.",
          casoUrl: "https://www.threatdown.com/resources/",
          ctaTexto: "Analiza tus accesos con SynAppsSys →",
          newsQuery: "robo credenciales corporativas phishing México 2026",
          datasheet: "https://www.threatdown.com/products-bundles/",
          dsLabel: "ThreatDown — Gestión de Identidad",
        },
        correo: {
          nombre: "Correo y Phishing", color: "#0E8F6E",
          subject: `${escenario || "Correo malicioso"}: el 90% de ataques empieza en el inbox`,
          intro: "Un solo clic en el enlace equivocado puede comprometer toda la organización. Los filtros básicos ya no son suficientes.",
          casoTitulo: "Caso real: campaña de phishing dirigido bloqueada antes del inbox",
          casoTexto: "Una institución educativa con 1,200 usuarios recibió una campaña de spear-phishing que imitaba a su banco corporativo. ThreatDown Email Security interceptó el 100% de los mensajes maliciosos antes de que llegaran a la bandeja de entrada.",
          casoUrl: "https://www.threatdown.com/wp-content/uploads/2025/07/TD_Email_Security_Datasheet.pdf",
          ctaTexto: "Evalúa tu protección de correo →",
          newsQuery: "phishing correo empresarial México ataque 2026",
          datasheet: "https://www.threatdown.com/wp-content/uploads/2025/07/TD_Email_Security_Datasheet.pdf",
          dsLabel: "ThreatDown Email Security — Datasheet",
        },
        red: {
          nombre: "Red y DNS", color: "#0369A1",
          subject: `${escenario || "Tráfico sospechoso"}: si ya salió la información, ya es tarde`,
          intro: "El tráfico hacia servidores desconocidos suele ser la última señal antes de una fuga de datos. La capa de red es donde se gana o se pierde.",
          casoTitulo: "Caso real: exfiltración de datos detenida a nivel DNS",
          casoTexto: "Una empresa logística detectó que un equipo intentaba conectarse a un servidor en Europa del Este cada 15 minutos. La protección DNS de ThreatDown bloqueó la comunicación y reveló que el equipo llevaba 3 días comprometido sin que nadie lo supiera.",
          casoUrl: "https://www.threatdown.com/resources/",
          ctaTexto: "Analiza tu tráfico de red con SynAppsSys →",
          newsQuery: "fuga datos red DNS exfiltración empresas 2026",
          datasheet: "https://www.threatdown.com/products-bundles/",
          dsLabel: "ThreatDown — Protección de Red",
        },
        ia: {
          nombre: "Uso de IA", color: "#B45309",
          subject: `${escenario || "IA no autorizada"}: ¿sabes qué herramientas de IA usa tu equipo hoy?`,
          intro: "ChatGPT, Gemini, Copilot — tu gente ya los usa. La pregunta es si tú tienes visibilidad sobre qué información comparten con esas herramientas.",
          casoTitulo: "Caso real: datos confidenciales enviados a una IA externa sin saberlo",
          casoTexto: "Un equipo de desarrollo de una fintech compartió fragmentos de código propietario con una IA externa durante semanas. ThreatDown lo detectó, registró los eventos y permitió al CISO tomar decisiones de política antes de que hubiera un incidente regulatorio.",
          casoUrl: "https://www.threatdown.com/resources/",
          ctaTexto: "Mapea el uso de IA en tu empresa →",
          newsQuery: "shadow AI herramientas IA no autorizadas empresas riesgo 2026",
          datasheet: "https://www.threatdown.com/wp-content/uploads/2025/11/TD_MDR_Datasheet.pdf",
          dsLabel: "ThreatDown MDR — Datasheet",
        },
      };

      const fi = FRENTE_INFO[fronteId] ?? null;

      // Buscar noticia dinámica via RSS de Malwarebytes (el propio fabricante ThreatDown)
      // Fire & forget — si falla el fetch (timeout/red) cae silenciosamente al caso fijo
      let noticiaHtml = "";
      if (fi) {
        try {
          const rssUrl = "https://www.malwarebytes.com/blog/feed";
          const rr = await fetch(rssUrl, {
            headers: { "User-Agent": "SynAppsSys-LeadApp/1.0" },
            signal: AbortSignal.timeout(5000),
          });
          if (rr.ok) {
            const xml = await rr.text();
            // Extraer todos los <item> del feed
            const items: { title: string; desc: string; link: string; pubDate: string }[] = [];
            const itemRe = /<item>([\s\S]*?)<\/item>/g;
            let m: RegExpExecArray | null;
            while ((m = itemRe.exec(xml)) !== null) {
              const block = m[1];
              const getTag = (tag: string) => {
                const t = new RegExp(`<${tag}[^>]*>(?:<\\!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i").exec(block);
                return t ? t[1].trim() : "";
              };
              items.push({
                title: getTag("title"),
                desc: getTag("description"),
                link: getTag("link"),
                pubDate: getTag("pubDate"),
              });
            }
            // Buscar el artículo más relevante para el frente usando palabras clave de newsQuery
            const keywords = fi.newsQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const scored = items.map(it => {
              const hay = `${it.title} ${it.desc}`.toLowerCase();
              const hits = keywords.reduce((n, kw) => n + (hay.includes(kw) ? 1 : 0), 0);
              return { ...it, hits };
            });
            scored.sort((a, b) => b.hits - a.hits);
            const art = scored[0]?.hits > 0 ? scored[0] : items[0]; // fallback al más reciente
            if (art && art.title && art.link) {
              const fechaStr = art.pubDate ? (() => {
                try { return new Date(art.pubDate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }); }
                catch { return ""; }
              })() : "";
              // Limpiar HTML de descripción
              const descClean = art.desc.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim().slice(0, 180);
              noticiaHtml = `
                <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin:0 0 24px">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em">
                    🗞️ Del blog de Malwarebytes${fechaStr ? ` — ${fechaStr}` : ""}
                  </p>
                  <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#162036;line-height:1.4">${art.title}</p>
                  ${descClean ? `<p style="margin:0 0 10px;font-size:13px;color:#475569;line-height:1.5">${descClean}…</p>` : ""}
                  <a href="${art.link}" target="_blank"
                     style="font-size:12px;color:#1d4ed8;text-decoration:none;font-weight:600">
                    Leer artículo completo →
                  </a>
                </div>`;
            }
          }
        } catch { /* no bloquea — el caso fijo siempre está */ }
      }

      const contextoHtml = fi ? `
        <!-- Caso de impacto por escenario -->
        <div style="background:#f8fafc;border-left:4px solid ${fi.color};border-radius:0 8px 8px 0;
                    padding:16px 20px;margin:0 0 20px">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${fi.color};
                    text-transform:uppercase;letter-spacing:.08em">📌 Caso de impacto</p>
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#162036">${fi.casoTitulo}</p>
          <p style="margin:0 0 12px;font-size:13px;color:#475569;line-height:1.6">${fi.casoTexto}</p>
          <a href="${fi.casoUrl}" target="_blank"
             style="display:inline-block;font-size:12px;font-weight:700;color:#fff;
                    background:${fi.color};padding:7px 14px;border-radius:6px;text-decoration:none">
            Ver más casos →
          </a>
        </div>
        ${noticiaHtml}
        <!-- Datasheet -->
        <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.06em">
          Recurso técnico
        </p>
        <a href="${fi.datasheet}" target="_blank"
           style="display:inline-block;font-size:13px;font-weight:600;color:#1d4ed8;
                  text-decoration:none;margin:0 0 24px">
          📄 ${fi.dsLabel}
        </a>` : "";

      const acepta = parsed.data.acepta_comunicaciones ?? false;

      resend.emails.send({
        from: `SynAppsSys <${fromDomain}>`,
        to: parsed.data.correo,
        subject: acepta
          ? `Assessment DNS de ${domain} — te lo enviamos como agradecimiento`
          : "Recibimos tu registro — SynAppsSys",
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:580px;margin:0 auto;color:#162036">

            <!-- Header -->
            <div style="background:#0f172a;padding:20px 28px;border-radius:12px 12px 0 0">
              <table cellpadding="0" cellspacing="0" style="width:100%">
                <tr>
                  <td>
                    <img src="https://registro.synappssys.com/logo-synappssys.png"
                         alt="SynAppsSys" style="height:30px;display:block"/>
                  </td>
                  <td style="text-align:right;font-size:11px;color:#64748b;font-weight:600">
                    ThreatDown Partner Platinum
                  </td>
                </tr>
              </table>
            </div>

            <!-- Cuerpo -->
            <div style="background:#ffffff;padding:28px 28px 8px;border:1px solid #e2e8f0;border-top:none">

              <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a">Hola, ${parsed.data.nombre}</h2>
              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6">
                Recibimos tu registro desde el evento iSEC 2026. Gracias por tomarte el tiempo.
              </p>

              ${acepta ? `
              <!-- Assessment DNS — solo si aceptó comunicaciones -->
              <p style="margin:0 0 12px;font-size:13px;color:#475569;line-height:1.6">
                Como agradecimiento, corrimos un análisis rápido de los registros DNS de
                <strong style="color:#0f172a">@${domain}</strong> para ver cómo está configurada
                la seguridad del correo de tu empresa. Aquí el resultado:
              </p>

              ${dnsHtml}

              <!-- Siguiente paso -->
              <div style="background:#0f172a;border-radius:10px;padding:20px 24px;margin:0 0 24px;text-align:center">
                <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;line-height:1.5">
                  ¿Quieres un análisis completo — DKIM, BIMI, registros MX secundarios y política DMARC a fondo?
                </p>
                <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#ffffff">
                  Agenda una sesión de 30 min con SynAppsSys — sin costo
                </p>
                <a href="https://calendly.com/salvador-ruiz-synappssys" target="_blank"
                   style="display:inline-block;font-size:13px;font-weight:700;color:#0f172a;
                          background:#ffffff;padding:11px 24px;border-radius:6px;text-decoration:none">
                  Agendar assessment completo →
                </a>
              </div>
              ` : `
              <!-- Sin assessment — solo confirmación -->
              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6">
                Un especialista de <strong>SynAppsSys</strong> revisará tu información y se pondrá en contacto contigo pronto.
              </p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:0 0 24px;text-align:center">
                <a href="https://calendly.com/salvador-ruiz-synappssys" target="_blank"
                   style="display:inline-block;font-size:13px;font-weight:700;color:#ffffff;
                          background:#2563eb;padding:11px 24px;border-radius:6px;text-decoration:none">
                  Agendar una llamada →
                </a>
              </div>
              `}

              <!-- Firma -->
              <table cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:4px;width:100%">
                <tr>
                  <td style="border-left:3px solid #2563eb;padding-left:14px">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a">Salvador Ruiz</p>
                    <p style="margin:3px 0 0;font-size:12px;color:#64748b">SynAppsSys · ThreatDown Partner Platinum</p>
                    <p style="margin:6px 0 0;font-size:12px;color:#64748b">
                      <a href="mailto:salvador.ruiz@synappssys.com"
                         style="color:#2563eb;text-decoration:none">salvador.ruiz@synappssys.com</a>
                      &nbsp;·&nbsp;
                      <a href="https://wa.me/525514389292"
                         style="color:#2563eb;text-decoration:none">+52 55 1438 9292</a>
                    </p>
                  </td>
                </tr>
              </table>

            </div>

            <!-- Footer -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;
                        border-radius:0 0 12px 12px;padding:14px 28px;text-align:center">
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6">
                Recibiste este correo porque te registraste en el evento iSEC 2026.
                ${acepta ? "Puedes cancelar comunicaciones respondiendo a este correo con el texto <strong>BAJA</strong>." : ""}
              </p>
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
