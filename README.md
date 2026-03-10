# SynAppsSys Events Lead App

Micro web app para captacion de prospectos en eventos, accesible por QR.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- API Route en Next.js
- Neon PostgreSQL (`@neondatabase/serverless`)
- Validacion de datos con Zod

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
3. Confirmacion: `/gracias`
4. Guardado de datos via API: `POST /api/prospects`

## Variables de Entorno

1. Copia el archivo de ejemplo:

```bash
cp .env.example .env.local
```

2. Configura `DATABASE_URL` con tu cadena de Neon.

Ejemplo:

```env
DATABASE_URL="postgresql://USER:PASSWORD@EP-XXXX-XXXX.us-east-2.aws.neon.tech/DB_NAME?sslmode=require"
```

## Esquema SQL Inicial

El esquema propuesto vive en `db/schema.sql`.

Para crearlo en Neon:

1. Abre el SQL editor de Neon.
2. Ejecuta el contenido de `db/schema.sql`.

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

## Desarrollo Local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Despliegue

### Vercel

1. Importa el repositorio.
2. Agrega `DATABASE_URL` en Project Settings > Environment Variables.
3. Deploy.

### Netlify

1. Importa el repositorio.
2. Build command: `npm run build`
3. Environment variable: `DATABASE_URL`
4. Deploy (se incluye `netlify.toml` con plugin Next.js).

## Endpoint para Guardar Registros

`POST /api/prospects`

Body JSON esperado:

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
