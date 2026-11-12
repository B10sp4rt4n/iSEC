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
        contexto_orbita
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
        ${parsed.data.contexto_orbita || null}
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

      resend.emails.send({
        from: `SynAppsSys <${fromDomain}>`,
        to: parsed.data.correo,
        subject: fi ? fi.subject : "Tu diagnóstico de ciberseguridad — SynAppsSys",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
              <div style="background:#162036;border-radius:6px;padding:6px 12px">
                <span style="font-size:13px;font-weight:800;color:#ffffff;letter-spacing:.04em">SynAppsSys</span>
              </div>
              <span style="font-size:12px;color:#94a3b8">× ThreatDown</span>
            </div>
            <h2 style="color:#162036;margin:0 0 12px">Hola, ${parsed.data.nombre}</h2>
            <p style="color:#475569;line-height:1.6;margin:0 0 20px">
              ${fi ? fi.intro : "Recibimos tu información. Un especialista de <strong>SynAppsSys</strong> se pondrá en contacto contigo pronto."}
            </p>

            ${contextoHtml}

            <!-- CTA Assessment -->
            <div style="background:#0f172a;border-radius:10px;padding:20px 24px;margin:0 0 24px;text-align:center">
              <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;line-height:1.5">
                ¿Quieres saber exactamente cómo está tu empresa en este frente?
              </p>
              <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#ffffff">
                Agenda un assessment gratuito con SynAppsSys
              </p>
              <a href="https://calendly.com/salvador-ruiz-synappssys" target="_blank"
                 style="display:inline-block;font-size:13px;font-weight:700;color:#0f172a;
                        background:#ffffff;padding:11px 22px;border-radius:6px;text-decoration:none">
                ${fi ? fi.ctaTexto : "Agendar assessment gratuito →"}
              </a>
            </div>

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

            <!-- Firma Salvador Ruiz -->
            <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#1e293b;margin-bottom:24px">
              <tr>
                <td style="padding-right:16px;vertical-align:top">
                  <img src="https://registro.synappssys.com/logo-synappssys.png"
                       alt="SynAppsSys" style="height:28px;display:block;margin-bottom:6px"/>
                </td>
                <td style="border-left:3px solid #162036;padding-left:16px;vertical-align:top">
                  <p style="margin:0;font-weight:700;color:#162036">Salvador Ruiz</p>
                  <p style="margin:2px 0 0;color:#475569">SynAppsSys · ThreatDown Partner Platinum</p>
                  <p style="margin:6px 0 0;color:#64748b">
                    e: <a href="mailto:salvador.ruiz@synappssys.com"
                         style="color:#162036;text-decoration:none">salvador.ruiz@synappssys.com</a>
                  </p>
                  <p style="margin:2px 0 0;color:#64748b">
                    wa: <a href="https://wa.me/525514389292"
                          style="color:#162036;text-decoration:none">+52 55 1438 9292</a>
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
