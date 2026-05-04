import { Resend } from 'resend';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const resend = new Resend(env.RESEND_API_KEY);
const sql = neon(env.DATABASE_URL);

const CHANNEL_CARGOS = new Set(['reseller','reseller_ventas','reseller_preventa','reseller_gerente','vendor_am','vendor_se','vendor_channel','vendor_mktg']);
const EXCLUDE = new Set(['blanca.pech@netpay.com.mx']);
// IDs enviados OK en el primer intento (antes del rate limit)
const SENT_OK_EMAILS = new Set([
  'victor.ruiz@itncode.com',
  'aalfaron@ipn.mx',
  'victor.nicaso@aldeasinfantiles.org.mx',
  'aareyesn@unam.mx',
  'jose.padilla@economia.gob.mx',
  'leluna@monex.com.mx',
  'javiruegash@monex.com.mx',
  'greco.altamirano@pcomega.mx',
  'flopez@anuies.mx',
  'oscar.cortez@cydsa.com',
  'fernando.hernandez10@bbva.com',
  'lnunez@insolmx.com.mx',
  'karen@viko.mx',
  'alberto@viko.mx',
  'lpina@insolmx.com.mx',
]);

const SUBJECT = 'Tu EDR, ¿detectaría los 5 patrones del reporte?';
const FROM = 'iSEC Infosecurity <no-reply@send.synappssys.com>';
const CALENDLY = 'https://calendly.com/salvador-ruiz-synappssys';
const REPORT_RECIPIENTS = ['sruiz@synappssys.com', 'ecotae0@gmail.com', 'ecota@threatdown.com'];

function buildHtml(nombre) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:96vw">

<!-- HEADER -->
<tr><td style="background:#0f172a;padding:28px 36px">
  <div style="margin-bottom:18px">
    <span style="background:#162036;border:1px solid #1e3a5f;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;color:#38bdf8;letter-spacing:.08em;text-transform:uppercase">
      iSEC Infosecurity &times; ThreatDown
    </span>
  </div>
  <h1 style="margin:0;color:#f8fafc;font-size:22px;font-weight:700;line-height:1.35">
    Tu EDR, &iquest;detectar&iacute;a los 5 patrones del reporte?
  </h1>
</td></tr>

<!-- BODY -->
<tr><td style="padding:36px 36px 0">
  <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7">Hola, <strong>${nombre}</strong>:</p>
  <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7">
    El dato que m&aacute;s llam&oacute; la atenci&oacute;n del <strong>2026 State of Malware</strong> no fue el volumen de ataques &mdash; fue el m&eacute;todo.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
  <tr><td style="background:#0f172a;border-left:4px solid #0ea5e9;border-radius:0 8px 8px 0;padding:18px 24px">
    <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6">
      El <span style="font-size:26px;font-weight:800;color:#38bdf8">86%</span> del cifrado por ransomware en 2025 se
      ejecut&oacute; de forma remota, usando
      <strong style="color:#e2e8f0">credenciales v&aacute;lidas, herramientas leg&iacute;timas y equipos internos</strong>.
      No malware nuevo. No exploits de d&iacute;a cero. Infraestructura propia de la organizaci&oacute;n, operada por el atacante.
    </p>
  </td></tr></table>

  <p style="margin:0 0 12px;font-size:15px;color:#334155;line-height:1.7">
    Lo que eso implica operativamente es concreto:
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
    <tr><td style="padding:8px 0">
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td style="width:4px;background:#0ea5e9;border-radius:2px;vertical-align:top">&nbsp;</td>
        <td style="padding:0 0 0 16px">
          <p style="margin:0;font-size:14px;color:#0f172a;font-weight:700">Visibilidad real</p>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.6">
            &iquest;El EDR cubre endpoints, servidores y equipos no administrados, o hay zonas ciegas?
          </p>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 0">
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td style="width:4px;background:#f59e0b;border-radius:2px;vertical-align:top">&nbsp;</td>
        <td style="padding:0 0 0 16px">
          <p style="margin:0;font-size:14px;color:#0f172a;font-weight:700">Detecci&oacute;n de comportamiento</p>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.6">
            &iquest;Distingue entre un usuario leg&iacute;timo usando RDP y un atacante haciendo lo mismo?
          </p>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 0">
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td style="width:4px;background:#ef4444;border-radius:2px;vertical-align:top">&nbsp;</td>
        <td style="padding:0 0 0 16px">
          <p style="margin:0;font-size:14px;color:#0f172a;font-weight:700">Velocidad de contenci&oacute;n</p>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.6">
            &iquest;En cu&aacute;nto tiempo puede aislar un equipo comprometido antes de que el cifrado avance?
          </p>
        </td>
      </tr></table>
    </td></tr>
  </table>

  <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7">
    El reporte identifica <strong>cinco patrones espec&iacute;ficos</strong> que pusieron a prueba la cobertura real de los EDR en 2025.
    La mayor&iacute;a de organizaciones tiene respuesta para uno o dos. Los atacantes los usan todos.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
  <tr><td style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;padding:16px 20px">
    <p style="margin:0;font-size:15px;color:#1e40af;line-height:1.7">
      Propongo una <strong>sesi&oacute;n de 30 minutos</strong> para convertir esos cinco patrones en una lectura
      simple de tu postura actual: cobertura, exposici&oacute;n y capacidad de contenci&oacute;n.
    </p>
  </td></tr></table>

  <p style="margin:0 0 28px;font-size:15px;color:#334155;font-weight:600">
    &iquest;Qu&eacute; espacio te funciona esta semana o la pr&oacute;xima?
  </p>

  <table cellpadding="0" cellspacing="0" style="margin-bottom:36px">
  <tr><td style="background:#0ea5e9;border-radius:8px">
    <a href="${CALENDLY}"
       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:8px;background:#0ea5e9">
      Agendar 30 minutos &rarr;
    </a>
  </td></tr></table>
</td></tr>

<!-- FIRMA -->
<tr><td style="padding:0 36px 36px">
  <table cellpadding="0" cellspacing="0" width="100%">
  <tr><td style="border-top:1px solid #e2e8f0;padding-top:24px">
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a">Salvador Ruiz Esparza</p>
    <p style="margin:0 0 2px;font-size:13px;color:#64748b">iSEC Infosecurity &mdash; Partner ThreatDown by Malwarebytes</p>
    <p style="margin:0 0 16px;font-size:12px;color:#0ea5e9">
      <a href="mailto:salvador.ruiz@synappssys.com" style="color:#0ea5e9;text-decoration:none">salvador.ruiz@synappssys.com</a>
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px">
      <tr><td style="border-top:1px dashed #e2e8f0;font-size:0">&nbsp;</td></tr>
    </table>
    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a">Estela Cota</p>
    <p style="margin:0 0 2px;font-size:13px;color:#64748b">ThreatDown by Malwarebytes &mdash; Territory Channel Account Manager, LATAM</p>
    <p style="margin:0;font-size:12px;color:#0ea5e9">
      <a href="mailto:ecota@threatdown.com" style="color:#0ea5e9;text-decoration:none">ecota@threatdown.com</a>
    </p>
  </td></tr></table>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0">
  <p style="margin:0 0 6px;font-size:11px;color:#94a3b8">
    &#9888;&#65039; Correo enviado desde direcci&oacute;n sin buz&oacute;n de respuesta.
    Escribe a <a href="mailto:salvador.ruiz@synappssys.com" style="color:#94a3b8">salvador.ruiz@synappssys.com</a>
  </p>
  <p style="margin:0;font-size:11px;color:#94a3b8">
    Recibiste este correo porque te registraste en un evento de iSEC Infosecurity.
    Para no contactar, escr&iacute;benos con el asunto <em>"No contactar"</em>.
  </p>
</td></tr>

</table>
</td></tr></table>
</body>
</html>`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const rows = await sql`SELECT id, nombre, correo, cargo FROM event_prospects ORDER BY created_at ASC`;
  const targets = rows.filter(p =>
    !CHANNEL_CARGOS.has(p.cargo) &&
    p.correo.includes('@') &&
    !EXCLUDE.has(p.correo.toLowerCase()) &&
    !SENT_OK_EMAILS.has(p.correo.toLowerCase())
  );

  console.log(`Total pendientes (excluidos ya enviados): ${targets.length}`);

  const results = [];
  const CHUNK = 5;

  for (let i = 0; i < targets.length; i += CHUNK) {
    const chunk = targets.slice(i, i + CHUNK);
    const res = await Promise.all(chunk.map(p =>
      resend.emails.send({ from: FROM, to: p.correo, subject: SUBJECT, html: buildHtml(p.nombre) })
        .then(({ data, error }) => ({
          correo: p.correo,
          nombre: p.nombre,
          ok: !error && !!data?.id,
          error: error?.message,
        }))
    ));
    results.push(...res);
    const ok = res.filter(r => r.ok).length;
    const fail = res.filter(r => !r.ok).length;
    console.log(`  Chunk ${Math.floor(i / CHUNK) + 1} [${chunk.map(r=>r.correo).join(', ')}] → ${ok} ok, ${fail} fail`);
    if (fail > 0) console.log('    Errores:', res.filter(r=>!r.ok).map(r=>`${r.correo}: ${r.error}`));
    if (i + CHUNK < targets.length) await sleep(1200);
  }

  const sentNow = results.filter(r => r.ok);
  const failedNow = results.filter(r => !r.ok);
  const allSentEmails = [...Array.from(SENT_OK_EMAILS), ...sentNow.map(r => r.correo)];

  console.log(`\n=== RESUMEN ===`);
  console.log(`Ya enviados (primer intento): ${SENT_OK_EMAILS.size}`);
  console.log(`Enviados ahora: ${sentNow.length}`);
  console.log(`Total acumulado: ${allSentEmails.length}`);
  console.log(`Fallidos: ${failedNow.length}`);
  if (failedNow.length > 0) {
    console.log('Fallidos:', failedNow.map(r => `${r.correo} — ${r.error}`));
  }

  // Correo de confirmación
  const sentDate = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  await resend.emails.send({
    from: FROM,
    to: REPORT_RECIPIENTS,
    subject: `[Reporte] Email 2 completado — ${allSentEmails.length} destinatarios · ${sentDate}`,
    html: `
<table style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <tr><td style="background:#0f172a;padding:20px 28px">
    <p style="margin:0;color:#38bdf8;font-size:13px;font-weight:700;text-transform:uppercase">iSEC — Reporte Email 2 (seguimiento)</p>
  </td></tr>
  <tr><td style="padding:24px 28px">
    <p style="margin:0 0 6px;font-size:13px;color:#64748b"><strong>Asunto:</strong> ${SUBJECT}</p>
    <p style="margin:0 0 18px;font-size:13px;color:#64748b"><strong>Fecha:</strong> ${sentDate}</p>
    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#16a34a">✅ ${allSentEmails.length} enviados en total</p>
    <p style="margin:0 0 18px;font-size:14px;color:#64748b">(${SENT_OK_EMAILS.size} del primer intento + ${sentNow.length} ahora)</p>
    ${failedNow.length > 0 ? `<p style="margin:0 0 18px;font-size:22px;font-weight:800;color:#dc2626">❌ ${failedNow.length} fallidos</p>` : '<p style="margin:0 0 18px;font-size:16px;color:#16a34a;font-weight:600">Sin errores.</p>'}
    <p style="margin:0 0 6px;font-size:12px;color:#64748b;font-weight:700">TODOS LOS DESTINATARIOS (${allSentEmails.length}):</p>
    <p style="margin:0;font-size:12px;color:#475569;line-height:1.9">${allSentEmails.join('<br>')}</p>
    ${failedNow.length > 0 ? `<p style="margin:18px 0 6px;font-size:12px;color:#dc2626;font-weight:700">FALLIDOS:</p><p style="margin:0;font-size:12px;color:#dc2626;line-height:1.8">${failedNow.map(r=>r.correo).join('<br>')}</p>` : ''}
  </td></tr>
</table>`,
  });
  console.log(`\n✅ Correo de confirmación enviado a: ${REPORT_RECIPIENTS.join(', ')}`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
