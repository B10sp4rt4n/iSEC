# DevKB — Shared AI Error Intelligence Network

> Base de conocimiento distribuida de errores resueltos, consumida por agentes IA en tiempo real.  
> Origen: iSEC Infosecurity · Arquitectura validada en producción · Mayo 2026

---

## Visión

Los agentes de IA (Copilot, Cursor, Claude) resuelven el mismo error una y otra vez en repos distintos porque no tienen memoria persistente entre proyectos. DevKB es la capa de memoria compartida que falta: una red de conocimiento donde cada error resuelto en cualquier repo beneficia a todos los demás, de forma automática y verificable.

**Analogía de posicionamiento:** Stack Overflow fue la memoria colectiva de los desarrolladores humanos. DevKB es la memoria colectiva de los agentes IA.

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    REPOS DE USUARIOS                            │
│                                                                 │
│  .github/copilot-instructions.md  ←  vector de distribución    │
│  npx devkb contribute             ←  vector de contribución     │
└──────────────────────┬──────────────────────────────────────────┘
                       │  HTTPS
┌──────────────────────▼──────────────────────────────────────────┐
│                   devkb.dev  (API pública)                      │
│                                                                 │
│  GET  /search?q=&stack=&patron=&scope=         — sin auth       │
│  POST /contribute                              — GitHub OAuth   │
│  GET  /verify/:commit_hash                     — verificación   │
│  GET  /stats                                   — leaderboard    │
│  POST /org/:slug/search                        — tier privado   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                   Neon PostgreSQL                               │
│                                                                 │
│  dev_knowledge_base   — issues verificados                      │
│  contributors         — identidad + reputación                  │
│  org_kb               — KB privada por organización             │
│  votes                — validación comunitaria                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Esquema de datos (v1.0 — especificación abierta)

```sql
CREATE TABLE dev_knowledge_base (
  id                    SERIAL PRIMARY KEY,
  numero                TEXT NOT NULL UNIQUE,        -- #001, #002...
  titulo                TEXT NOT NULL,
  estado                TEXT CHECK (estado IN ('resuelto','abierto','en_progreso')),
  fecha                 DATE NOT NULL,
  modulo                TEXT NOT NULL,               -- archivo afectado
  tags                  TEXT[] NOT NULL,             -- keywords rápidos
  sintoma               TEXT NOT NULL,               -- lo que el usuario ve
  causa_raiz            TEXT NOT NULL,               -- por qué ocurre
  solucion              TEXT NOT NULL,               -- qué se cambió
  intentos_fallidos     JSONB NOT NULL DEFAULT '[]', -- [{intento, por_que_fallo}]
  leccion_aprendida     TEXT NOT NULL,               -- regla general

  -- Inteligencia compartida
  patron                TEXT,           -- payload_size | timeout | serialization...
  aplica_a              TEXT[],         -- otros stacks donde aplica
  impacto               TEXT CHECK (impacto IN ('critico','alto','medio','bajo')),
  entorno               TEXT,           -- produccion | local | netlify...
  commit_fix            TEXT,           -- hash verificable vía GitHub API
  tiempo_resolucion_min INT,
  detectado_por         TEXT,           -- usuario | logs | monitor | copilot
  contexto_ia           TEXT,           -- texto denso para LLM/embeddings

  -- Red y confianza
  author_github         TEXT,           -- login del contribuidor
  repo_origin           TEXT,           -- repo donde ocurrió
  verified              BOOLEAN DEFAULT FALSE,
  verified_at           TIMESTAMPTZ,
  content_hash          TEXT,           -- integridad: SHA256 del contenido
  upvotes               INT DEFAULT 0,
  times_matched         INT DEFAULT 0,  -- cuántas veces fue útil

  proyecto              TEXT NOT NULL DEFAULT 'public',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Modelo de confianza (Trust Ladder)

| Nivel | Nombre | Criterio | Comportamiento de la IA |
|---|---|---|---|
| 0 | Unverified | Recién subido, sin commit | Lo muestra con disclaimer, no lo cita como solución |
| 1 | Commit-backed | `commit_fix` verificado en GitHub API | Lo cita como posible solución |
| 2 | Community | ≥5 upvotes de usuarios con repos activos | Lo prioriza en resultados |
| 3 | Maintainer | Revisado por equipo DevKB | Aparece como "solución oficial" |

La IA **nunca ejecuta código de la KB directamente** — solo lo presenta al humano. La barrera humana es el último filtro de seguridad.

---

## Criterios de lanzamiento (Launch Readiness Checklist)

### P0 — Bloqueantes absolutos (no se lanza sin estos)

- [ ] **Verificación de commit_fix vía GitHub API**  
  Antes de pasar a Nivel 1, el sistema consulta `api.github.com/repos/:owner/:repo/commits/:sha` y confirma que el commit existe y está en un repo público. Sin esto, cualquiera puede fabricar un fix.

- [ ] **Content hash + firma de integridad**  
  Calcular SHA256 del contenido en el momento de aprobación. Cualquier modificación posterior rompe la firma y la entrada baja a Nivel 0 automáticamente.

- [ ] **Rate limiting en /contribute**  
  Máximo 10 contribuciones por hora por GitHub token. Sin esto, automatizar spam es trivial.

- [ ] **Análisis estático de la sección `solucion`**  
  Rechazar entradas que contengan: `eval()`, `exec()`, `child_process`, acceso a `process.env`, URLs externas en código sugerido. Esto mitiga el vector de envenenamiento más obvio.

- [ ] **Scope privado vs público en búsqueda**  
  El campo `proyecto` no puede ser `public` en una KB org sin verificación del dominio de la organización. Evita que una org envenene el espacio público.

- [ ] **Política de privacidad y términos explícitos**  
  Cualquier contribución al scope `public` se licencia bajo CC BY-SA 4.0. El contribuidor debe aceptarlo explícitamente en el flujo de OAuth.

### P1 — Requeridos para credibilidad técnica

- [ ] **CLI `npx devkb`** funcional con `search`, `contribute` y `verify`
- [ ] **Endpoint `/search` con tiempo de respuesta < 200ms** bajo carga de 100 req/s
- [ ] **Caché local SQLite** que se sincroniza cada 24h — el repo funciona offline
- [ ] **Badge dinámico** para README: `![DevKB](https://devkb.dev/badge/:author)`
- [ ] **Seed inicial de ≥ 50 issues verificados** en al menos 5 stacks distintos antes de anunciar
- [ ] **Documentación del esquema v1.0** publicada como spec abierta en GitHub

### P2 — Requeridos para monetización

- [ ] **GitHub OAuth** con scope `read:user` para identidad
- [ ] **Dashboard de organización** con KB privada, métricas de uso y gestión de issues
- [ ] **Webhook de notificación** cuando un issue nuevo de tu stack es añadido a la KB
- [ ] **SLA documentado** para tier enterprise (uptime, latencia, soporte)

---

## Esquema de mitigación de riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Envenenamiento de datos** | Alta | Crítico | Trust Ladder P0 + análisis estático + barrera humana obligatoria |
| **GitHub hace esto nativo** | Media | Alto | Publicar spec abierta antes del lanzamiento · ser el dataset, no el intermediario |
| **Cold start — KB vacía no sirve** | Alta | Alto | Seeding con Stack Overflow + import de issues cerrados de repos GitHub |
| **Fragmentación (todos hacen su silo)** | Media | Medio | Scope híbrido público/privado en el mismo producto — no es o/o |
| **Degradación por volumen (ILIKE no escala)** | Baja | Medio | Migrar `contexto_ia` a vector embeddings (pgvector) al superar 10k entradas |
| **Abuso de API pública** | Alta | Bajo | Rate limiting + caché agresivo en CDN + identificación por User-Agent del repo |
| **Modelos con memoria integrada** | Media | Alto | Pivote a dataset propietario con licencia de uso para entrenamiento |
| **Contribuciones de baja calidad** | Alta | Medio | `commit_fix` como requisito para Nivel 1 · reputación pública visible |

---

## Go-to-Market

### Fase 1 — Tracción técnica (0–3 meses)
**Objetivo:** 500 repos con `copilot-instructions.md` apuntando a DevKB

**Acciones:**
- Publicar la spec abierta `devkb-spec-v1.0` en GitHub con licencia MIT — facilita que otras herramientas adopten el esquema
- Post técnico en Dev.to / Hashnode: *"We built a shared memory layer for AI coding agents"* — con el caso real de iSEC y el issue de Resend como prueba de concepto
- Script de un comando para añadir DevKB a cualquier repo:
  ```bash
  curl -s https://devkb.dev/install | bash
  # Añade 3 líneas a .github/copilot-instructions.md
  ```
- Abrir issues en repos populares de Next.js, Prisma, Resend con la solución y un link a la KB — backlinks orgánicos + visibilidad en foros relevantes

### Fase 2 — Masa crítica (3–6 meses)
**Objetivo:** 2,000 issues verificados · 5,000 repos activos · primeros ingresos

**Acciones:**
- **GitHub Marketplace App** — instalar DevKB en un repo desde Marketplace en un click; inyecta el `copilot-instructions.md` automáticamente
- **Import de issues cerrados** — el usuario autoriza acceso a sus repos y el sistema procesa automáticamente issues cerrados como candidatos a KB (con aprobación humana)
- **Programa de contribuidores destacados** — top 20 con badge verificado, mención en changelog semanal
- **Integración con VS Code Extension** — panel lateral que muestra issues KB mientras escribes, sin salir del editor
- Lanzar **org-scoped KB** en beta privada con 10 empresas seleccionadas: $99/mes por organización

### Fase 3 — Monetización y escala (6–18 meses)
**Objetivo:** MRR $10k · 50,000 repos · conversaciones con OpenAI/Anthropic

**Pricing:**

| Tier | Precio | Incluye |
|---|---|---|
| **Open** | Gratis | Búsqueda pública ilimitada · 5 contribuciones/mes |
| **Pro** | $19/mes por usuario | Contribuciones ilimitadas · historial · badge verificado |
| **Team** | $99/mes por org | KB privada · webhooks · métricas de equipo · 5 usuarios |
| **Enterprise** | $500+/mes | KB privada + pública segmentada · SLA · SSO · soporte dedicado |

**Pivote de dataset (18+ meses):**  
Con ≥100k issues verificados y `commit_fix` real, el corpus se convierte en dataset de entrenamiento de alta calidad para modelos de código. Conversación con OpenAI, Anthropic, Google DeepMind para licenciar el dataset. Esta ruta convierte el producto de SaaS B2B a infraestructura de IA — orden de magnitud diferente en valoración.

---

## Stack recomendado para el producto independiente

| Componente | Tecnología | Razón |
|---|---|---|
| API | Next.js 15 App Router | Ya dominado, serverless-ready |
| DB | Neon PostgreSQL + pgvector | Escala a embeddings sin migración |
| Auth | GitHub OAuth (iron-session) | El usuario ya existe en GitHub |
| CLI | Node.js + `commander` + `npx` | Cero instalación para el usuario |
| Deploy | Vercel (API) + Cloudflare CDN | Latencia global < 100ms |
| Caché | Upstash Redis | Rate limiting + caché de búsquedas |
| Embeddings | OpenAI text-embedding-3-small | Cuando ILIKE no escale |

---

## Métricas de éxito por fase

| Métrica | Mes 1 | Mes 3 | Mes 6 | Mes 12 |
|---|---|---|---|---|
| Issues verificados | 50 | 500 | 2,000 | 20,000 |
| Repos activos | 10 | 500 | 5,000 | 50,000 |
| Búsquedas/día | 100 | 5,000 | 50,000 | 500,000 |
| MRR | $0 | $0 | $2,000 | $15,000 |
| Contribuidores únicos | 5 | 100 | 1,000 | 10,000 |

---

## Estado actual

| Componente | Estado |
|---|---|
| Esquema de tabla `dev_knowledge_base` | ✅ En producción (Neon) |
| `GET /api/kb/search` | ✅ Implementado (con auth) |
| `lookupKnownError()` helper | ✅ En `src/lib/db.ts` |
| Integración en catch de API routes | ✅ `campaign/route.ts` |
| UI con detección de issue conocido | ✅ `CampaignPanel` |
| `scripts/seed-knowledge-base.mjs` | ✅ Operativo |
| Issue #001 documentado | ✅ Resend RangeError |
| `copilot-instructions.md` | ✅ En `.github/` |
| Búsqueda pública sin auth | ⬜ P1 |
| Verificación de commit_fix vía GitHub API | ⬜ P0 |
| CLI `npx devkb` | ⬜ P1 |
| GitHub OAuth para contribuidores | ⬜ P1 |
| Spec v1.0 publicada | ⬜ P0 |

---

*Documento generado: 2026-05-04 · iSEC Infosecurity · Confidencial hasta publicación de spec*
