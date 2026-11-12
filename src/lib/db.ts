import { neon } from "@neondatabase/serverless";

export function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta configurada.");
  }

  return neon(databaseUrl);
}

/**
 * Busca en la knowledge base si el error lanzado coincide con un issue
 * documentado. Devuelve el primer match (más crítico / más reciente) o null.
 *
 * Uso en catch blocks:
 *   const known = await lookupKnownError(sql, error.message);
 *   console.error("[kb]", known?.numero, known?.titulo);
 */
export async function lookupKnownError(
  sql: ReturnType<typeof getSqlClient>,
  errorText: string,
): Promise<{ numero: string; titulo: string; solucion: string; commit_fix: string | null } | null> {
  try {
    const keyword = errorText.slice(0, 120).toLowerCase();
    const rows = await sql`
      SELECT numero, titulo, solucion, commit_fix
      FROM dev_knowledge_base
      WHERE estado = 'resuelto'
        AND (
          contexto_ia ILIKE ${"%" + keyword.split(" ")[0] + "%"}
          OR sintoma   ILIKE ${"%" + keyword.split(" ")[0] + "%"}
          OR causa_raiz ILIKE ${"%" + keyword.split(" ")[0] + "%"}
        )
      ORDER BY
        CASE impacto WHEN 'critico' THEN 1 WHEN 'alto' THEN 2 ELSE 3 END
      LIMIT 1
    ` as { numero: string; titulo: string; solucion: string; commit_fix: string | null }[];
    return rows[0] ?? null;
  } catch {
    // No bloquear el flujo principal si la KB falla
    return null;
  }
}

export async function ensureEventSchema(sql: ReturnType<typeof getSqlClient>) {
  await sql`
    CREATE TABLE IF NOT EXISTS event_prospects (
      id UUID PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      empresa VARCHAR(120) NOT NULL,
      cargo VARCHAR(120) NOT NULL,
      correo VARCHAR(180) NOT NULL,
      telefono VARCHAR(40),
      pregunta_cerrada_1 VARCHAR(80) NOT NULL,
      pregunta_cerrada_2 VARCHAR(80) NOT NULL,
      dolor_reto TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_event_prospects_created_at
    ON event_prospects (created_at DESC);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_event_prospects_correo
    ON event_prospects (correo);
  `;

  // Agrega columna folio si no existe (consecutivo del sorteo)
  await sql`
    ALTER TABLE event_prospects
    ADD COLUMN IF NOT EXISTS folio SERIAL;
  `;

  // Agrega columna contexto_orbita si no existe
  await sql`
    ALTER TABLE event_prospects
    ADD COLUMN IF NOT EXISTS contexto_orbita VARCHAR(200);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS event_raffle_winners (
      id UUID PRIMARY KEY,
      prospect_id UUID NOT NULL UNIQUE REFERENCES event_prospects(id) ON DELETE CASCADE,
      prize_position SMALLINT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_prize_position_range CHECK (prize_position BETWEEN 1 AND 4)
    );
  `;

  // Migra constraint de 3 a 4 lugares si ya existe la tabla
  await sql`
    ALTER TABLE event_raffle_winners
    DROP CONSTRAINT IF EXISTS chk_prize_position_range;
  `;
  await sql`
    ALTER TABLE event_raffle_winners
    ADD CONSTRAINT chk_prize_position_range CHECK (prize_position BETWEEN 1 AND 4);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_event_raffle_winners_position
    ON event_raffle_winners (prize_position);
  `;

  // ── Notas de seguimiento por prospecto ──────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS prospect_notes (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prospect_id  UUID NOT NULL REFERENCES event_prospects(id) ON DELETE CASCADE,
      autor        VARCHAR(120) NOT NULL DEFAULT 'usuario',
      contenido    TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_prospect_notes_prospect_id
    ON prospect_notes (prospect_id, created_at ASC);
  `;

  // ── Alertas / calendario de contacto ────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS prospect_alerts (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prospect_id  UUID NOT NULL REFERENCES event_prospects(id) ON DELETE CASCADE,
      scheduled_at TIMESTAMPTZ NOT NULL,
      titulo       VARCHAR(200) NOT NULL DEFAULT 'Llamada de seguimiento',
      nota         TEXT NOT NULL DEFAULT '',
      completado   BOOLEAN NOT NULL DEFAULT FALSE,
      created_by   VARCHAR(120) NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_prospect_alerts_prospect_id
    ON prospect_alerts (prospect_id, scheduled_at ASC);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_prospect_alerts_scheduled
    ON prospect_alerts (scheduled_at ASC)
    WHERE completado = FALSE;
  `;
}

export async function ensureUsersSchema(sql: ReturnType<typeof getSqlClient>) {
  await sql`
    CREATE TABLE IF NOT EXISTS usuarios (
      user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      alias         VARCHAR(60) NOT NULL UNIQUE,
      nombre        VARCHAR(120) NOT NULL,
      apellido      VARCHAR(120) NOT NULL,
      password_hash TEXT NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_usuarios_alias
    ON usuarios (alias);
  `;
}
