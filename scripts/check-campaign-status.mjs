/**
 * check-campaign-status.mjs
 *
 * Consulta la API de Resend para listar todos los correos enviados de la campaña
 * y muestra cuáles fueron entregados correctamente vs los que fallaron.
 *
 * Uso: node scripts/check-campaign-status.mjs
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_Dq6NqMTU_Ld5BiZtLJwYTXRrL4nMnMo49";
const CAMPAIGN_SUBJECT = "El 86% del ransomware ya se ejecuta de forma remota";
const BASE_URL = "https://api.resend.com";

async function fetchEmails(limit = 100, offset = 0) {
  const res = await fetch(`${BASE_URL}/emails?limit=${limit}&offset=${offset}`, {
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend API error ${res.status}: ${txt}`);
  }
  return res.json();
}

async function fetchEmailDetail(id) {
  const res = await fetch(`${BASE_URL}/emails/${id}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log("🔍 Consultando correos de campaña en Resend...\n");

  const campaignEmails = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const page = await fetchEmails(limit, offset);
    const items = page.data ?? [];

    for (const email of items) {
      if (email.subject === CAMPAIGN_SUBJECT) {
        campaignEmails.push(email);
      }
    }

    hasMore = page.has_more;
    offset += limit;

    // Salimos si la fecha del último correo de la página es anterior al evento
    if (items.length > 0) {
      const last = new Date(items[items.length - 1].created_at);
      if (last < new Date("2026-04-27T00:00:00Z")) {
        hasMore = false;
      }
    }
  }

  if (campaignEmails.length === 0) {
    console.log("⚠️  No se encontraron correos de esta campaña en Resend.");
    return;
  }

  console.log(`📧 Correos encontrados de la campaña: ${campaignEmails.length}\n`);

  const VALID_STATUS = new Set(["delivered", "opened", "clicked"]);
  const delivered = [];
  const bounced = [];
  const other = [];

  for (const email of campaignEmails) {
    const to = Array.isArray(email.to) ? email.to[0] : email.to;
    const entry = {
      correo: to,
      id: email.id,
      status: email.last_event ?? "unknown",
      created_at: email.created_at,
    };

    if (VALID_STATUS.has(entry.status)) {
      delivered.push(entry);
    } else if (entry.status === "bounced" || entry.status === "complained") {
      bounced.push(entry);
    } else {
      other.push(entry);
    }
  }

  // ── Reporte ──────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log(`✅  ENTREGADOS / ABIERTOS / CON CLICK: ${delivered.length}`);
  console.log("═══════════════════════════════════════════════════════");
  for (const e of delivered) {
    console.log(`   ${e.correo.padEnd(45)} [${e.status}]`);
  }

  if (other.length > 0) {
    console.log(`\n⏳  OTROS (sent/queued/delivery_delayed): ${other.length}`);
    console.log("───────────────────────────────────────────────────────");
    for (const e of other) {
      console.log(`   ${e.correo.padEnd(45)} [${e.status}]`);
    }
  }

  if (bounced.length > 0) {
    console.log(`\n❌  BOUNCED / COMPLAINED: ${bounced.length}`);
    console.log("───────────────────────────────────────────────────────");
    for (const e of bounced) {
      console.log(`   ${e.correo.padEnd(45)} [${e.status}]`);
    }
  }

  const total = delivered.length + bounced.length + other.length;
  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`📊  RESUMEN: ${total} total | ${delivered.length} válidos | ${bounced.length} bounced | ${other.length} pendientes`);

  // CSV opcional
  const csv = ["correo,status,id,created_at"];
  for (const e of [...delivered, ...other, ...bounced]) {
    csv.push(`${e.correo},${e.status},${e.id},${e.created_at}`);
  }
  const fs = await import("fs");
  fs.writeFileSync("scripts/campaign-results.csv", csv.join("\n"), "utf8");
  console.log("📄  Resultados guardados en: scripts/campaign-results.csv\n");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
