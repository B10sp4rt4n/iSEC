# SynAppsSys Events Lead App

Micro web app para captación de prospectos en eventos, accesible por QR.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- API Routes en Next.js
- Neon PostgreSQL (`@neondatabase/serverless`)
- Validación de datos con Zod

## Comandos

```bash
npm install      # instalar dependencias
npm run dev       # servidor de desarrollo (http://localhost:3000)
npm run build      # build de producción
npm run start      # servir build de producción
npm run lint       # eslint
```

## Estructura Inicial

```text
.
├── db/
│   └── schema.sql
├── src/
│   ├── app/
│   │   ├── api/prospects/route.ts
│   │   ├── gracias/page.tsx
│   │   ├── registro/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── lead-form.tsx
│   └── lib/
│       └── db.ts
├── .env.example
├── netlify.toml
└── README.md
```

## Flujo Funcional

1. Landing page: `/`
2. Formulario de registro: `/registro`
3. Confirmación: `/gracias`
4. Guardado de datos vía API: `POST /api/prospects`

## Variables de Entorno

Copiar `.env.example` a `.env.local` y configurar `DATABASE_URL` con la cadena de conexión de Neon:

```env
DATABASE_URL="postgresql://USER:PASSWORD@EP-XXXX-XXXX.us-east-2.aws.neon.tech/DB_NAME?sslmode=require"
```

## Esquema SQL

El esquema vive en `db/schema.sql`. Se ejecuta en el SQL editor de Neon.

Tabla principal: `event_prospects`

- `nombre`
- `empresa`
- `cargo`
- `correo`
- `telefono` (opcional)
- `pregunta_cerrada_1`
- `pregunta_cerrada_2`
- `dolor_reto`
- `created_at`

## Endpoint para Guardar Registros

`POST /api/prospects`

```json
{
	"nombre": "Ana Torres",
	"empresa": "Logistica MX",
	"cargo": "Gerente de Operaciones",
	"correo": "ana@logisticamx.com",
	"telefono": "+52 55 1234 5678",
	"pregunta_cerrada_1": "automatizacion",
	"pregunta_cerrada_2": "0-3_meses",
	"dolor_reto": "Tenemos demoras en la integracion entre ventas y operaciones"
}
```

## Sorteo En Vivo (Evento)

1. Pantalla pública: `/sorteo`
2. Control privado: `/sorteo/control`
3. Botón para sacar 1 ganador por premio (máximo 3)

Requiere `RAFFLE_ADMIN_KEY` (variable de entorno) para autorizar la ejecución de ganadores. Sin esa clave, el endpoint de sorteo no permite ejecutar ganadores.

Los ganadores se guardan en la tabla `event_raffle_winners` (ver `db/schema.sql` actualizado).

## Despliegue

- **Vercel**: importar repo, agregar `DATABASE_URL` en Project Settings > Environment Variables, deploy.
- **Netlify**: importar repo, build command `npm run build`, variable `DATABASE_URL`, deploy (incluye `netlify.toml` con plugin Next.js).

## Snapshot de sesión
Última actualización: 2026-08-13

**En qué estoy trabajando ahora mismo:**
- Formalizando el hábito de snapshot de contexto en CLAUDE.md para sobrevivir destrucción de codespace

**Últimos cambios aplicados:**
- `CLAUDE.md` — agregada sección "## Snapshot de sesión" como respaldo de contexto en-repo
- `c4f3632` — removidos secrets hardcodeados, agregado CLAUDE.md inicial
- `ff63ea8` — logos ThreatDown y SynAppsSys añadidos a `public/logos`

**Siguiente paso concreto:**
- Definir qué features o bugs siguen en el roadmap (sorteo, email de confirmación, exportar CSV de prospectos, etc.) y actualizar este snapshot al cerrar sesión

---
> **Nota:** Este snapshot vive en el repo intencionalmente — sobrevive si el codespace se destruye y se crea uno nuevo. No reemplaza `~/.claude`, lo complementa. Al cerrar cada sesión larga, Claude Code preguntará si actualizar esta sección.
