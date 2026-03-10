-- =============================================================
-- iSEC – SynAppsSys Event Registration Schema
-- Compatible with Neon PostgreSQL
-- =============================================================

-- Tabla de eventos (para reutilización en campañas futuras)
CREATE TABLE IF NOT EXISTS eventos (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha       DATE,
    lugar       VARCHAR(200),
    activo      BOOLEAN DEFAULT TRUE,
    creado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla principal de registros de participantes
CREATE TABLE IF NOT EXISTS registros (
    id                  SERIAL PRIMARY KEY,
    evento_id           INTEGER REFERENCES eventos(id) ON DELETE SET NULL,

    -- Datos de contacto
    nombre              VARCHAR(200) NOT NULL,
    empresa             VARCHAR(200),
    cargo               VARCHAR(200),
    correo              VARCHAR(255) NOT NULL,
    telefono            VARCHAR(30),

    -- Preguntas cerradas (opciones predefinidas)
    respuesta_cerrada_1 VARCHAR(200),
    respuesta_cerrada_2 VARCHAR(200),

    -- Pregunta abierta: principal dolor o reto
    respuesta_abierta   TEXT,

    -- Metadatos
    folio               VARCHAR(20) UNIQUE,          -- folio de participación (opcional futuro)
    ip_origen           VARCHAR(45),
    user_agent          TEXT,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de búsqueda frecuente
CREATE INDEX IF NOT EXISTS idx_registros_evento   ON registros (evento_id);
CREATE INDEX IF NOT EXISTS idx_registros_correo   ON registros (correo);
CREATE INDEX IF NOT EXISTS idx_registros_empresa  ON registros (empresa);
CREATE INDEX IF NOT EXISTS idx_registros_creado   ON registros (creado_en DESC);

-- Evento inicial de ejemplo (ajustar según el evento real)
INSERT INTO eventos (nombre, descripcion, fecha, lugar)
VALUES (
    'iSEC 2025 – Conectando Soluciones',
    'Evento de networking y demostración de soluciones tecnológicas empresariales de SynAppsSys.',
    '2025-06-01',
    'Ciudad de México'
) ON CONFLICT DO NOTHING;
