/**
 * seed-knowledge-base.mjs
 * Crea la tabla dev_knowledge_base en Neon e inserta el issue #001.
 * Uso: node scripts/seed-knowledge-base.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Leer .env.local manualmente (sin dependencia de dotenv en ESM)
const env = Object.fromEntries(
  readFileSync("/workspaces/iSEC/.env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const sql = neon(env.DATABASE_URL);

async function main() {
  // ── Crear tabla ───────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS dev_knowledge_base (
      id                    SERIAL PRIMARY KEY,
      numero                TEXT NOT NULL UNIQUE,
      titulo                TEXT NOT NULL,
      estado                TEXT NOT NULL DEFAULT 'resuelto'
                              CHECK (estado IN ('resuelto','abierto','en_progreso')),
      fecha                 DATE NOT NULL DEFAULT CURRENT_DATE,
      modulo                TEXT NOT NULL,
      tags                  TEXT[] NOT NULL DEFAULT '{}',
      sintoma               TEXT NOT NULL,
      causa_raiz            TEXT NOT NULL,
      solucion              TEXT NOT NULL,
      intentos_fallidos     JSONB NOT NULL DEFAULT '[]',
      leccion_aprendida     TEXT NOT NULL,

      -- Inteligencia compartida
      patron                TEXT,
      aplica_a              TEXT[],
      impacto               TEXT NOT NULL DEFAULT 'medio'
                              CHECK (impacto IN ('critico','alto','medio','bajo')),
      entorno               TEXT,
      commit_fix            TEXT,
      tiempo_resolucion_min INT,
      detectado_por         TEXT,
      contexto_ia           TEXT,

      proyecto              TEXT NOT NULL DEFAULT 'iSEC',
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("✅ Tabla dev_knowledge_base creada/verificada");

  await sql`CREATE INDEX IF NOT EXISTS idx_dkb_tags    ON dev_knowledge_base USING GIN (tags)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_dkb_patron  ON dev_knowledge_base (patron)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_dkb_impacto ON dev_knowledge_base (impacto)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_dkb_proyecto ON dev_knowledge_base (proyecto)`;
  console.log("✅ Índices creados");

  // ── Issue #001 ─────────────────────────────────────────────────────────────
  const intentos = [
    {
      intento: "Usar resend.batch.send() con todos los correos en un solo array",
      por_que_fallo:
        "JSON.stringify del payload intentó serializar 4.6 MB × 30 correos ≈ 138 MB en un solo string, superando el límite de longitud de string en V8 (RangeError: Invalid string length)",
    },
    {
      intento: "Diagnosticar como timeout de Netlify Functions",
      por_que_fallo:
        "El error ocurría también en local con el servidor Next.js, descartando el timeout de Netlify como causa raíz",
    },
  ];

  await sql`
    INSERT INTO dev_knowledge_base (
      numero, titulo, estado, fecha, modulo, tags,
      sintoma, causa_raiz, solucion,
      intentos_fallidos, leccion_aprendida,
      patron, aplica_a, impacto, entorno, commit_fix,
      tiempo_resolucion_min, detectado_por, contexto_ia, proyecto
    ) VALUES (
      '#001',
      'RangeError en broadcast de campaña con PDF adjunto vía Resend',
      'resuelto',
      '2026-04-28',
      'src/app/api/campaign/route.ts',
      ARRAY['resend','batch','pdf','adjunto','broadcast','rangeerror','v8','payload','next.js','email-campaign'],
      'El botón de envío masivo retornaba "✗ Error de conexión." en el frontend. El servidor respondía HTTP 500 sin body. El modo individual (un solo prospecto) funcionaba correctamente.',
      'resend.batch.send() construye un array de objetos que incluyen el buffer del PDF (4.6 MB c/u). Node/V8 intenta serializar ese array completo como JSON antes de enviarlo. Con 30 correos el string supera el límite de V8 lanzando RangeError: Invalid string length. El modo individual no fallaba porque serializa un solo buffer a la vez.',
      'Reemplazar resend.batch.send() con Promise.all() en chunks de 5, enviando cada email individualmente con resend.emails.send(). Cada llamada lleva su propio payload con un único buffer del PDF. La concurrencia de 5 mantiene velocidad sin acumular tamaño en memoria.',
      ${JSON.stringify(intentos)}::jsonb,
      'Nunca usar batch/bulk API cuando los ítems incluyen buffers grandes (adjuntos, imágenes, blobs). El array completo se serializa a JSON antes de enviarse, multiplicando el tamaño por N. Con adjuntos, usar siempre Promise.all() en lotes pequeños (3-10) con requests individuales.',
      'payload_size',
      ARRAY['node.js resend','node.js sendgrid','node.js mailgun','aws-ses-sdk','cualquier bulk API que serialice JSON con buffers grandes'],
      'critico',
      'local + produccion (netlify)',
      '44ee096',
      45,
      'usuario + logs servidor',
      'broadcast email campaña resend PDF adjunto buffer blob RangeError Invalid string length V8 JSON.stringify payload demasiado grande batch bulk send Promise.all chunks lotes individuales Next.js API serverless',
      'iSEC'
    )
    ON CONFLICT (numero) DO NOTHING
  `;
  console.log("✅ Issue #001 insertado");

  // Verificar
  const rows = await sql`SELECT numero, titulo, estado, impacto, patron, commit_fix FROM dev_knowledge_base`;
  console.log("\n📚 Knowledge Base actual:");
  for (const r of rows) {
    console.log(`  ${r.numero} [${r.estado}][${r.impacto}] ${r.titulo}`);
    console.log(`       patron: ${r.patron}  commit: ${r.commit_fix}`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
