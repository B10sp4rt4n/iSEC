import { neon } from "@neondatabase/serverless";

export function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta configurada.");
  }

  return neon(databaseUrl);
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
