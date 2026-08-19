import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

function loadEnv() {
  const text = readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    text.split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );
}

const env = loadEnv();
const sql = neon(env.DATABASE_URL);

// 1. Duplicados por correo
const dupes = await sql`
  SELECT
    LOWER(TRIM(correo)) as correo_norm,
    COUNT(*) as total,
    array_agg(id ORDER BY created_at ASC) as ids,
    array_agg(nombre ORDER BY created_at ASC) as nombres,
    array_agg(empresa ORDER BY created_at ASC) as empresas,
    array_agg(created_at::text ORDER BY created_at ASC) as fechas
  FROM event_prospects
  GROUP BY LOWER(TRIM(correo))
  HAVING COUNT(*) > 1
  ORDER BY correo_norm
`;

if (dupes.length === 0) {
  console.log("✅ Sin duplicados por correo en la BD.");
} else {
  console.log(`⚠️  ${dupes.length} correos duplicados encontrados:\n`);
  for (const d of dupes) {
    console.log(`Correo: ${d.correo_norm}  (${d.total} registros)`);
    for (let i = 0; i < d.ids.length; i++) {
      const tag = i === 0 ? "← CONSERVAR" : "← ELIMINAR";
      console.log(`  [${i+1}] ${d.ids[i]}  ${d.nombres[i]} / ${d.empresas[i]}  ${d.fechas[i]}  ${tag}`);
    }
    console.log();
  }
  console.log(`IDs a ELIMINAR (duplicados más recientes):`);
  const toDelete = dupes.flatMap((d) => d.ids.slice(1));
  console.log(toDelete.join("\n"));
  console.log(`\nTotal a eliminar: ${toDelete.length}`);
}

// 2. Total de prospectos
const [{ total }] = await sql`SELECT COUNT(*) as total FROM event_prospects`;
console.log(`\nTotal registros en BD: ${total}`);
