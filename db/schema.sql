CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS event_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio SERIAL,
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

CREATE INDEX IF NOT EXISTS idx_event_prospects_created_at
  ON event_prospects (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_prospects_correo
  ON event_prospects (correo);

CREATE TABLE IF NOT EXISTS event_raffle_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL UNIQUE REFERENCES event_prospects(id) ON DELETE CASCADE,
  prize_position SMALLINT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_prize_position_range CHECK (prize_position BETWEEN 1 AND 4)
);

CREATE INDEX IF NOT EXISTS idx_event_raffle_winners_position
  ON event_raffle_winners (prize_position);

-- ── OSINT: Security Exposure ───────────────────────────────────────────────
-- Stores lightweight domain security analysis results.
-- open_ports is stored as a JSON array string e.g. "[80,443]"
CREATE TABLE IF NOT EXISTS security_exposure (
  id        SERIAL PRIMARY KEY,
  domain    TEXT NOT NULL UNIQUE,
  score     INTEGER NOT NULL,
  spf       BOOLEAN NOT NULL DEFAULT FALSE,
  dmarc     BOOLEAN NOT NULL DEFAULT FALSE,
  open_ports TEXT NOT NULL DEFAULT '[]',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_exposure_score
  ON security_exposure (score ASC);

-- ── Usuarios ───────────────────────────────────────────────────────────────
-- Tabla de usuarios internos que pueden crear y gestionar sus cotizaciones.
CREATE TABLE IF NOT EXISTS usuarios (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias         VARCHAR(60) NOT NULL UNIQUE,
  nombre        VARCHAR(120) NOT NULL,
  apellido      VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_alias
  ON usuarios (alias);

-- ── Demo LEADFRAME ─────────────────────────────────────────────────────────
-- Prospectos capturados a través del flujo demo en /demo/registro
CREATE TABLE IF NOT EXISTS demo_prospects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     VARCHAR(120) NOT NULL,
  empresa    VARCHAR(120) NOT NULL,
  cargo      VARCHAR(120) NOT NULL,
  correo     VARCHAR(180) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_prospects_created_at
  ON demo_prospects (created_at DESC);
