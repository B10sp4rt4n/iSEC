/**
 * Análisis completo de deduplicación:
 *   - Duplicados internos en BD
 *   - Duplicados internos en Excel
 *   - Duplicados cruzados (en ambos)
 *   - Lista final limpia para broadcast
 *
 * Uso:
 *   node scripts/dedup-full.mjs            → solo reporte
 *   node scripts/dedup-full.mjs --delete   → elimina dupes de BD y muestra lista final
 */

import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";

const DRY_RUN = !process.argv.includes("--delete");

// ─── Env ─────────────────────────────────────────────────────────────────────
function loadEnv() {
  const text = readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    text.split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );
}

const CHANNEL_CARGOS = new Set([
  "reseller", "reseller_ventas", "reseller_preventa", "reseller_gerente",
  "vendor_am", "vendor_se", "vendor_channel", "vendor_mktg",
]);

// Destinatarios fijos que siempre se incluyen (aunque no estén en BD ni Excel)
const ALWAYS_INCLUDE = [
  { correo: "ecota@threatdown.com", nombre: "Estela Cota", empresa: "ThreatDown", fuente: "FIJO" },
  { correo: "ecotae0@gmail.com", nombre: "Estela Cota", empresa: "ThreatDown", fuente: "FIJO" },
];

const EXCLUDE_EMAILS = new Set([
  "sruiz@synappssys.com",
  "salvador.ruizesparza.mx@gmail.com",
  "b10sp4rt4n@gmail.com",
]);

// ─── BD ──────────────────────────────────────────────────────────────────────
const env = loadEnv();
const sql = neon(env.DATABASE_URL);

const dbRows = await sql`
  SELECT id, nombre, empresa, cargo, correo, created_at
  FROM event_prospects
  ORDER BY created_at ASC
`;

// ─── Excel 1: Prospectos Estela Cota ─────────────────────────────────────────
function parseCotaXlsx() {
  try {
    const wb = xlsxRead(readFileSync("prospeccion_estela_cota (1).xlsx"));
    const ws = wb.Sheets["Prospectos"];
    const raw = xlsxUtils.sheet_to_json(ws, { header: 1, defval: "" });
    const headers = raw[3].map((h) => String(h).trim().toLowerCase());
    const ci = headers.findIndex((h) => h.includes("correo") || h.includes("email") || h.includes("mail"));
    const ni = headers.findIndex((h) => h.includes("contacto") || h.includes("nombre"));
    const ei = headers.findIndex((h) => h.includes("empresa"));
    return raw.slice(4)
      .map((row) => ({
        correo: String(row[ci] ?? "").trim().toLowerCase(),
        nombre: String(row[ni] ?? "").trim(),
        empresa: String(row[ei] ?? "").trim(),
        fuente: "Excel-Cota",
      }))
      .filter((r) => r.correo.includes("@"));
  } catch {
    console.log("  ⚠️  prospeccion_estela_cota (1).xlsx no encontrado — se omite.");
    return [];
  }
}

// ─── Excel 2: ISEC Base Deduplicada 2026 ─────────────────────────────────────
const PERSONAL_DOMAINS = new Set(["gmail.com","hotmail.com","hotmail.es","yahoo.com","yahoo.com.mx","outlook.com","live.com","icloud.com"]);

function isCorporate(email) {
  const domain = email.split("@")[1] ?? "";
  return !PERSONAL_DOMAINS.has(domain.toLowerCase());
}

function pickBestEmail(raw) {
  const parts = raw.split(";").map((s) => s.trim().toLowerCase()).filter((s) => s.includes("@"));
  return parts.find(isCorporate) ?? parts[0] ?? "";
}

// Tipos canal a excluir (contienen "EMPRESA CANAL IT")
function isCanal(tipo) {
  return String(tipo).toUpperCase().includes("EMPRESA CANAL IT") &&
         !String(tipo).toUpperCase().includes("INVITADO VIP");
}

function parseIsecXlsx() {
  try {
    const wb = xlsxRead(readFileSync("ISEC_InfoSecurity_2026_Base_Deduplicada.xlsx"));
    const ws = wb.Sheets["Base deduplicada"];
    const raw = xlsxUtils.sheet_to_json(ws, { header: 1, defval: "" });
    // Columnas (índice 3 = fila 4): Origen[0] Tipo[1] Empresa[2] Cargo[3] Apellido[4] Nombre[5] Tel[6] Email[7]
    return raw.slice(4)
      .filter((row) => !isCanal(row[1]))
      .map((row) => {
        const emailRaw = String(row[7] ?? "").trim();
        const correo = pickBestEmail(emailRaw);
        const nombre = [String(row[5] ?? "").trim(), String(row[4] ?? "").trim()].filter(Boolean).join(" ");
        return {
          correo,
          nombre,
          empresa: String(row[2] ?? "").trim(),
          fuente: "Excel-ISEC",
        };
      })
      .filter((r) => r.correo.includes("@"));
  } catch {
    console.log("  ⚠️  ISEC_InfoSecurity_2026_Base_Deduplicada.xlsx no encontrado — se omite.");
    return [];
  }
}

const cotaRows = parseCotaXlsx();
const isecRows = parseIsecXlsx();
const excelRows = [...cotaRows, ...isecRows];

console.log(`\n━━━ FUENTES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`BD total:          ${dbRows.length} prospectos`);
console.log(`Excel Cota:        ${cotaRows.length} contactos`);
console.log(`Excel ISEC 2026:   ${isecRows.length} contactos (canal excluido)`);
console.log(`Excel combinado:   ${excelRows.length} total`);

// ─── 1. Duplicados internos en BD ────────────────────────────────────────────
const dbByEmail = new Map();
const dbDupeIds = [];

for (const row of dbRows) {
  const email = row.correo.toLowerCase().trim();
  if (dbByEmail.has(email)) {
    dbDupeIds.push(row.id);
  } else {
    dbByEmail.set(email, row);
  }
}

console.log(`\n━━━ 1. DUPLICADOS INTERNOS EN BD (${dbDupeIds.length}) ━━━━━━━━━━━━━━━`);
if (dbDupeIds.length === 0) {
  console.log("  ✅ Sin duplicados");
} else {
  // Re-derive for display
  const emailCount = new Map();
  for (const row of dbRows) {
    const e = row.correo.toLowerCase().trim();
    emailCount.set(e, (emailCount.get(e) || 0) + 1);
  }
  for (const [email, count] of emailCount) {
    if (count > 1) console.log(`  ⚠️  ${email}  (${count}x) — se conserva el más antiguo`);
  }
}

// ─── 2. Duplicados internos en Excel ─────────────────────────────────────────
const xlByEmail = new Map();
const xlDupes = [];

for (const row of excelRows) {
  if (xlByEmail.has(row.correo)) {
    xlDupes.push(row.correo);
  } else {
    xlByEmail.set(row.correo, row);
  }
}

const xlDupeSet = [...new Set(xlDupes)];
console.log(`\n━━━ 2. DUPLICADOS INTERNOS EN EXCEL (${xlDupeSet.length} correos) ━━━━━━━━━━`);
if (xlDupeSet.length === 0) {
  console.log("  ✅ Sin duplicados");
} else {
  for (const e of xlDupeSet) console.log(`  ⚠️  ${e}`);
}

// ─── 3. Cruzados: Excel ∩ BD ────────────────────────────────────────────────
const crossDupes = [];
for (const [email, row] of xlByEmail) {
  if (dbByEmail.has(email)) {
    crossDupes.push({ email, xlRow: row, dbRow: dbByEmail.get(email) });
  }
}

console.log(`\n━━━ 3. EN EXCEL Y EN BD (${crossDupes.length}) — se enviaría 2 veces ━━━`);
if (crossDupes.length === 0) {
  console.log("  ✅ Sin coincidencias");
} else {
  for (const { email, xlRow, dbRow } of crossDupes) {
    console.log(`  📧 ${email}`);
    console.log(`     BD:    ${dbRow.nombre} / ${dbRow.empresa}`);
    console.log(`     Excel: ${xlRow.nombre} / ${xlRow.empresa}`);
  }
}

// ─── 4. Lista final limpia ────────────────────────────────────────────────────
const finalEmails = new Set();
const finalList = [];

// Primero DB (filtrada)
for (const row of dbRows) {
  const email = row.correo.toLowerCase().trim();
  if (
    !CHANNEL_CARGOS.has(row.cargo) &&
    !EXCLUDE_EMAILS.has(email) &&
    !finalEmails.has(email)
  ) {
    finalEmails.add(email);
    finalList.push({ fuente: "BD", nombre: row.nombre, empresa: row.empresa, correo: email });
  }
}

// Luego Excel (solo los nuevos)
for (const [email, row] of xlByEmail) {
  if (!EXCLUDE_EMAILS.has(email) && !finalEmails.has(email)) {
    finalEmails.add(email);
    finalList.push({ fuente: "XLS", nombre: row.nombre, empresa: row.empresa, correo: email });
  }
}

// Siempre incluir destinatarios fijos (al final, sin duplicar)
for (const r of ALWAYS_INCLUDE) {
  if (!finalEmails.has(r.correo)) {
    finalEmails.add(r.correo);
    finalList.push(r);
  }
}

console.log(`\n━━━ 4. LISTA FINAL PARA BROADCAST ━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  BD limpios:    ${finalList.filter(r => r.fuente === "BD").length}`);
console.log(`  Excel nuevos:  ${finalList.filter(r => r.fuente === "XLS").length}`);
console.log(`  TOTAL:         ${finalList.length}`);

// ─── 5. Acción sobre BD ───────────────────────────────────────────────────────
if (dbDupeIds.length > 0) {
  console.log(`\n━━━ 5. LIMPIEZA DE BD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Se eliminarían ${dbDupeIds.length} registros duplicados.`);
    console.log(`  Ejecuta con --delete para aplicar.`);
    console.log(`  IDs:\n  ${dbDupeIds.join("\n  ")}`);
  } else {
    const deleted = await sql`
      DELETE FROM event_prospects
      WHERE id = ANY(${dbDupeIds})
    `;
    console.log(`  ✅ Eliminados ${dbDupeIds.length} duplicados de la BD.`);
  }
}

console.log();
