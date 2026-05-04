/**
 * GET /api/kb/search?q=<texto_del_error>
 *
 * Busca en la knowledge base si el texto del error coincide con algún
 * issue documentado. Útil tanto para el frontend (mostrar solución conocida)
 * como para agentes/logs automáticos.
 *
 * Requiere header: x-admin-key
 */

import { NextResponse } from "next/server";
import { getSqlClient } from "@/lib/db";

type KBRow = {
  numero: string;
  titulo: string;
  estado: string;
  impacto: string;
  patron: string | null;
  sintoma: string;
  causa_raiz: string;
  solucion: string;
  leccion_aprendida: string;
  commit_fix: string | null;
  tags: string[];
  aplica_a: string[] | null;
  fecha: string;
};

function isAuthorized(request: Request): boolean {
  const key = process.env.RAFFLE_ADMIN_KEY;
  return !!key && request.headers.get("x-admin-key") === key;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Parámetro 'q' requerido (mínimo 3 caracteres)." }, { status: 400 });
  }

  const sql = getSqlClient();

  // Búsqueda en: contexto_ia, sintoma, causa_raiz, tags (array)
  // Usa ILIKE para cada palabra del query (split por espacios)
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 10);

  const results = await sql`
    SELECT
      numero, titulo, estado, impacto, patron,
      sintoma, causa_raiz, solucion, leccion_aprendida,
      commit_fix, tags, aplica_a, fecha
    FROM dev_knowledge_base
    WHERE
      estado = 'resuelto'
      AND (
        contexto_ia ILIKE ${"%" + words[0] + "%"}
        OR sintoma   ILIKE ${"%" + words[0] + "%"}
        OR causa_raiz ILIKE ${"%" + words[0] + "%"}
        OR tags && ${words}::text[]
      )
    ORDER BY
      CASE impacto
        WHEN 'critico' THEN 1
        WHEN 'alto'    THEN 2
        WHEN 'medio'   THEN 3
        ELSE 4
      END,
      fecha DESC
    LIMIT 5
  ` as KBRow[];

  return NextResponse.json({
    ok: true,
    query: q,
    matches: results.length,
    results,
  });
}
