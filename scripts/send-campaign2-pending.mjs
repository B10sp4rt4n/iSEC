/**
 * send-campaign2-pending.mjs
 * Envía Email 2 a los prospectos que aún NO lo recibieron hoy.
 * Excluye: canal, Blanca de Netpay, ya enviados.
 */
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync("/workspaces/iSEC/.env.local", "utf8")
    .split("\n").filter(l => l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const sql    = neon(env.DATABASE_URL);
const resend = new Resend(env.RESEND_API_KEY);
const FROM   = `iSEC Infosecurity <${env.RESEND_FROM ?? "no-reply@send.synappssys.com"}>`;
const SUBJECT = "Tu EDR, ¿detectaría los 5 patrones del reporte?";
const CALENDLY = "https://calendly.com/salvador-ruiz-synappssys";

const CANAL = new Set(["reseller","reseller_ventas","reseller_preventa","reseller_gerente","vendor_am","vendor_se","vendor_channel","vendor_mktg"]);

// ── 1. Obtener ya enviados de Resend ─────────────────────────────────────────
async function getAlreadySent() {
  const sent = new Set();
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const r = await fetch(`https://api.resend.com/emails?limit=100&offset=${offset}`, {
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` }
    });
    const j = await r.json();
    const items = j.data ?? [];
    for (const e of items) {
      if (e.subject === SUBJECT) sent.add(e.to[0]?.toLowerCase());
    }
    hasMore = j.has_more;
    offset += 100;
    if (items.length > 0) {
      const last = new Date(items[items.length-1].created_at);
      if (last < new Date("2026-05-04T00:00:00Z")) hasMore = false;
    }
  }
  return sent;
}

// ── 2. HTML del correo ────────────────────────────────────────────────────────
function buildHtml(nombre) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:96vw">
<tr><td style="background:#0f172a;padding:28px 36px">
  <div style="margin-bottom:18px"><span style="display:inline-block;background:#162036;border:1px solid #1e3a5f;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;color:#38bdf8;letter-spacing:0.08em;text-transform:uppercase">iSEC Infosecurity × ThreatDown</span></div>
  <h1 style="margin:0;color:#f8fafc;font-size:22px;font-weight:700;line-height:1.35">Tu EDR, ¿detectaría los 5 patrones del reporte?</h1>
</td></tr>
<tr><td style="padding:36px 36px 0">
  <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7">Hola, <strong>${nombre}</strong>:</p>
  <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7">El dato que más llamó la atención del <strong>2026 State of Malware</strong> no fue el volumen de ataques — fue el método.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
    <tr><td style="background:#0f172a;border-left:4px solid #0ea5e9;border-radius:0 8px 8px 0;padding:18px 24px">
      <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6">El <span style="font-size:26px;font-weight:800;color:#38bdf8">86%</span> del cifrado por ransomware en 2025 se ejecutó de forma remota, usando <strong style="color:#e2e8f0">credenciales válidas, herramientas legítimas y equipos internos</strong>.<br>No malware nuevo. No exploits de día cero. Infraestructura propia de la organización, operada por el atacante.</p>
    </td></tr>
  </table>
  <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.7">Lo que eso implica operativamente es concreto:</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
    <tr><td style="padding:8px 0"><table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="width:4px;background:#0ea5e9;border-radius:2px;vertical-align:top">&nbsp;</td>
      <td style="padding:0 0 0 16px"><p style="margin:0;font-size:14px;color:#0f172a;font-weight:700;line-height:1.4">Visibilidad real</p><p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.6">¿El EDR cubre endpoints, servidores y equipos no administrados, o hay zonas ciegas?</p></td>
    </tr></table></td></tr>
    <tr><td style="padding:8px 0"><table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="width:4px;background:#f59e0b;border-radius:2px;vertical-align:top">&nbsp;</td>
      <td style="padding:0 0 0 16px"><p style="margin:0;font-size:14px;color:#0f172a;font-weight:700;line-height:1.4">Detección de comportamiento</p><p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.6">¿Distingue entre un usuario legítimo usando RDP y un atacante haciendo lo mismo?</p></td>
    </tr></table></td></tr>
    <tr><td style="padding:8px 0"><table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="width:4px;background:#ef4444;border-radius:2px;vertical-align:top">&nbsp;</td>
      <td style="padding:0 0 0 16px"><p style="margin:0;font-size:14px;color:#0f172a;font-weight:700;line-height:1.4">Velocidad de contención</p><p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.6">¿En cuánto tiempo puede aislar un equipo comprometido antes de que el cifrado avance?</p></td>
    </tr></table></td></tr>
  </table>
  <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7">El reporte identifica <strong>cinco patrones específicos</strong> que pusieron a prueba la cobertura real de los EDR en 2025. La mayoría de organizaciones tiene respuesta para uno o dos. Los atacantes los usan todos.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
    <tr><td style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;padding:16px 20px">
      <p style="margin:0;font-size:15px;color:#1e40af;line-height:1.7">Propongo una <strong>sesión de 30 minutos</strong> para convertir esos cinco patrones en una lectura simple de tu postura actual: cobertura, exposición y capacidad de contención.</p>
    </td></tr>
  </table>
  <p style="margin:0 0 28px;font-size:15px;color:#334155;font-weight:600;line-height:1.7">¿Qué espacio te funciona esta semana o la próxima?</p>
  <table cellpadding="0" cellspacing="0" style="margin-bottom:36px">
    <tr><td style="background:#0ea5e9;border-radius:8px;padding:0">
      <a href="${CALENDLY}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;background:#0ea5e9">Agendar 30 minutos →</a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 36px 36px">
  <table cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-top:1px solid #e2e8f0;padding-top:24px">
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a">Salvador Ruiz Esparza</p>
    <p style="margin:0 0 2px;font-size:13px;color:#64748b">iSEC Infosecurity — Partner ThreatDown by Malwarebytes</p>
    <p style="margin:0 0 16px;font-size:12px;color:#0ea5e9"><a href="mailto:salvador.ruiz@synappssys.com" style="color:#0ea5e9;text-decoration:none">salvador.ruiz@synappssys.com</a></p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px"><tr><td style="border-top:1px dashed #e2e8f0;font-size:0;line-height:0">&nbsp;</td></tr></table>
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a">Estela Cota</p>
    <p style="margin:0 0 2px;font-size:13px;color:#64748b">ThreatDown by Malwarebytes — Territory Channel Account Manager, LATAM</p>
    <p style="margin:0;font-size:12px;color:#0ea5e9"><a href="mailto:ecota@threatdown.com" style="color:#0ea5e9;text-decoration:none">ecota@threatdown.com</a></p>
  </td></tr></table>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
  <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.6">⚠️ Este correo fue enviado desde una dirección sin buzón de respuesta. Para cualquier consulta, escribe a <a href="mailto:salvador.ruiz@synappssys.com" style="color:#94a3b8">salvador.ruiz@synappssys.com</a>.</p>
  <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6">Recibiste este correo porque te registraste en un evento de iSEC Infosecurity. Si no deseas recibir más comunicaciones, escríbenos con el asunto <em>"No contactar"</em>.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ── 3. Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Consultando ya enviados en Resend...");
  const alreadySent = await getAlreadySent();
  console.log(`   Ya enviados hoy: ${alreadySent.size}`);

  console.log("📋 Obteniendo prospectos de DB...");
  const rows = await sql`SELECT nombre, correo, cargo FROM event_prospects ORDER BY created_at ASC`;

  const targets = rows.filter(p =>
    !CANAL.has(p.cargo) &&
    p.correo.includes("@") &&
    !p.correo.toLowerCase().includes("netpay") &&
    !p.nombre.toLowerCase().includes("blanca") &&
    !alreadySent.has(p.correo.toLowerCase())
  );

  console.log(`📧 Pendientes por enviar: ${targets.length}\n`);

  if (targets.length === 0) {
    console.log("✅ No hay pendientes. Campaña ya completa.");
    return;
  }

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: p.correo,
        subject: SUBJECT,
        html: buildHtml(p.nombre),
      });
      const ok = !error && !!data?.id;
      results.push({ correo: p.correo, ok, error: error?.message });
      console.log(`  ${ok ? "✅" : "❌"} ${p.correo}`);
    } catch(e) {
      results.push({ correo: p.correo, ok: false, error: e.message });
      console.log(`  ❌ ${p.correo} — ${e.message}`);
    }
    // Pausa de 300ms entre envíos para respetar rate limit de Resend
    if (i < targets.length - 1) await new Promise(r => setTimeout(r, 300));
  }

  const sent     = results.filter(r => r.ok);
  const failed   = results.filter(r => !r.ok);
  const allSent  = [...alreadySent, ...sent.map(r => r.correo)];
  const sentDate = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

  console.log(`\n📊 Pendientes enviados: ${sent.length} ok, ${failed.length} fallidos`);

  // ── Correo de confirmación ──────────────────────────────────────────────────
  const notifHtml = `
  <table style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
    <tr><td style="background:#0f172a;padding:20px 28px">
      <p style="margin:0;color:#38bdf8;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">iSEC Infosecurity — Reporte Email 2</p>
    </td></tr>
    <tr><td style="padding:24px 28px">
      <p style="margin:0 0 12px;font-size:15px;color:#0f172a;font-weight:700">Campaña Email 2 completada</p>
      <p style="margin:0 0 6px;font-size:13px;color:#64748b"><strong>Asunto:</strong> ${SUBJECT}</p>
      <p style="margin:0 0 18px;font-size:13px;color:#64748b"><strong>Fecha:</strong> ${sentDate}</p>
      <table style="border-collapse:collapse;width:100%">
        <tr style="background:#f1f5f9">
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#0f172a">✅ Total enviados</td>
          <td style="padding:10px 14px;font-size:22px;font-weight:800;color:#16a34a">${allSent.length}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#0f172a">❌ Fallidos</td>
          <td style="padding:10px 14px;font-size:22px;font-weight:800;color:#dc2626">${failed.length}</td>
        </tr>
      </table>
      <p style="margin:18px 0 6px;font-size:12px;color:#64748b;font-weight:700">LISTA COMPLETA DE DESTINATARIOS:</p>
      <p style="margin:0;font-size:12px;color:#475569;line-height:2">${allSent.join("<br>")}</p>
      ${failed.length > 0 ? `<p style="margin:18px 0 6px;font-size:12px;color:#dc2626;font-weight:700">FALLIDOS:</p><p style="margin:0;font-size:12px;color:#dc2626;line-height:2">${failed.map(r=>r.correo).join("<br>")}</p>` : ""}
    </td></tr>
  </table>`;

  await resend.emails.send({
    from: FROM,
    to: ["sruiz@synappssys.com", "ecotae0@gmail.com", "ecota@threatdown.com"],
    subject: `[Reporte] Email 2 completo — ${allSent.length} destinatarios · ${sentDate}`,
    html: notifHtml,
  });

  console.log("📬 Correo de confirmación enviado a sruiz, ecotae0 y ecota@threatdown.com");
}

main().catch(e => { console.error(e.message); process.exit(1); });
