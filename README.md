# iSEC – Plataforma de Captación Comercial · SynAppsSys

**iSEC** es una web app ligera y reutilizable para eventos y dinámicas de captación comercial de SynAppsSys.  
Los visitantes llegan escaneando un QR, registran sus datos, responden 2 preguntas cerradas y 1 pregunta abierta, y quedan inscritos en la base de datos de seguimiento.

---

## Características

| Característica | Detalle |
|---|---|
| **Landing de evento** | Branding SynAppsSys, pasos del flujo y CTA de registro |
| **Formulario de registro** | Nombre, empresa, cargo, correo, teléfono opcional |
| **Preguntas cerradas** | 2 preguntas de opción múltiple configurables |
| **Pregunta abierta** | Captura el principal dolor o reto del visitante |
| **Pantalla de confirmación** | Mensaje de éxito + próximos pasos |
| **API REST** | `POST /api/registro` guarda el registro en Neon PostgreSQL |
| **Validación** | Cliente y servidor (email, teléfono, campos requeridos) |
| **Responsive** | Optimizado para móvil (uso en eventos presenciales) |
| **Reutilizable** | Configuración de preguntas en un solo lugar |

---

## Stack

- **Frontend:** [Next.js 16](https://nextjs.org/) + TypeScript + Tailwind CSS v4
- **Base de datos:** [Neon PostgreSQL](https://neon.tech/) (serverless)
- **Hosting:** [Vercel](https://vercel.com/) (recomendado) o Netlify
- **Driver DB:** [`@neondatabase/serverless`](https://github.com/neondatabase/serverless)

---

## Estructura del proyecto

```
iSEC/
├── app/
│   ├── layout.tsx              # Layout raíz (metadata, fuentes)
│   ├── globals.css             # Estilos globales + variables CSS
│   ├── page.tsx                # Home / landing
│   ├── registro/
│   │   └── page.tsx            # Formulario de registro
│   ├── gracias/
│   │   └── page.tsx            # Pantalla de confirmación
│   └── api/
│       └── registro/
│           └── route.ts        # POST endpoint → guarda en Neon
├── lib/
│   └── db.ts                   # Conexión a Neon PostgreSQL
├── schema.sql                  # Esquema SQL inicial
├── .env.local.example          # Plantilla de variables de entorno
└── README.md
```

---

## Requisitos previos

- Node.js 18+
- Una cuenta en [Neon](https://neon.tech/) con un proyecto y base de datos creada

---

## Inicio rápido

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/B10sp4rt4n/iSEC.git
cd iSEC
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` y coloca tu connection string de Neon:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

> Encuentra tu connection string en [Neon Console](https://console.neon.tech) → tu proyecto → **Connection Details**.

### 3. Crear el esquema en Neon

Ejecuta el contenido de `schema.sql` en el SQL Editor de Neon Console, o con psql:

```bash
psql "$DATABASE_URL" -f schema.sql
```

Esto crea:
- Tabla `eventos` (para gestionar múltiples eventos/campañas)
- Tabla `registros` (datos de participantes + respuestas)
- Índices de búsqueda
- Un evento inicial de ejemplo

### 4. Correr en modo desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Despliegue en Vercel (recomendado)

1. Conecta tu repositorio de GitHub a [Vercel](https://vercel.com/new).
2. En **Environment Variables**, agrega `DATABASE_URL` con tu connection string de Neon.
3. Haz deploy. Vercel detecta Next.js automáticamente.
4. Apunta tu subdominio `eventos.synappssys.com` a la URL de Vercel en tu DNS.

---

## Despliegue en Netlify

1. Conecta el repositorio en [Netlify](https://app.netlify.com/start).
2. Build command: `npm run build`  |  Publish directory: `.next`
3. Activa **Next.js Runtime** en el plugin de Netlify.
4. Agrega `DATABASE_URL` en **Site Settings → Environment Variables**.

---

## API

### `POST /api/registro`

Guarda un nuevo registro de participante.

**Body (JSON):**

```json
{
  "nombre": "María González",
  "empresa": "Grupo Industrial ABC",
  "cargo": "Directora de Operaciones",
  "correo": "maria@empresa.com",
  "telefono": "+52 55 1234 5678",
  "respuesta_cerrada_1": "51 – 200 empleados",
  "respuesta_cerrada_2": "Operaciones y Logística",
  "respuesta_abierta": "No tenemos visibilidad en tiempo real de nuestro inventario.",
  "evento_id": 1
}
```

**Respuestas:**

| Código | Descripción |
|--------|-------------|
| `201` | Registro guardado · `{ success: true, id, creado_en }` |
| `422` | Errores de validación · `{ errors: string[] }` |
| `400` | Cuerpo inválido |
| `500` | Error interno del servidor |

---

## Personalizar preguntas del formulario

Las preguntas cerradas y la pregunta abierta se configuran en la parte superior de `app/registro/page.tsx`:

```ts
const PREGUNTA_CERRADA_1 = {
  label: "¿Cuál es el tamaño de tu empresa?",
  options: ["1 – 10 empleados", "11 – 50 empleados", ...],
};

const PREGUNTA_CERRADA_2 = { ... };

const PREGUNTA_ABIERTA = "¿Cuál es tu principal dolor o reto de negocio actualmente?";
```

---

## Roadmap sugerido

- [ ] Validación y verificación de correo electrónico
- [ ] Folio de participación único por registro
- [ ] Panel de administración para ver registros
- [ ] Automatización de seguimiento comercial (email)
- [ ] Soporte para múltiples eventos activos simultáneamente
- [ ] Diagnóstico express / cuestionario extendido
- [ ] Exportación CSV de registros

---

## Licencia

© SynAppsSys. Todos los derechos reservados.
