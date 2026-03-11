# Guía de configuración — Nuevo cliente / nuevo evento

Tiempo estimado: **2–3 horas** para un cliente completamente nuevo.

---

## FASE 1 — Infraestructura base (solo la primera vez por cliente)

### 1.1 Repositorio
1. Duplica este repo en GitHub:
   `GitHub → iSEC → Use this template → Create a new repository`
2. Nómbralo con el cliente/evento: ej. `event-fortinet-2026`
3. Clona el nuevo repo localmente

### 1.2 Base de datos (Neon)
1. Ve a [console.neon.tech](https://console.neon.tech)
2. Crea un nuevo proyecto: ej. `fortinet-event`
3. Copia la **Connection string** (con `sslmode=require`)
4. Guárdala — la usarás como `DATABASE_URL`

> La tabla se crea automáticamente en el primer registro gracias a `ensureEventSchema()`. No necesitas ejecutar nada manualmente.

### 1.3 Dominio de envío (Resend)
1. Ve a [resend.com](https://resend.com) → **Domains → Add Domain**
2. Agrega el dominio del cliente: ej. `send.clientedominio.com`
3. Resend te da registros DNS (TXT + MX) — agrégalos en Cloudflare/registro del cliente
4. Espera la verificación (verde ✅)
5. Genera una nueva **API Key** para este cliente
6. El valor de `RESEND_FROM` será: `no-reply@send.clientedominio.com`

---

## FASE 2 — Personalización del contenido

### 2.1 Variables de entorno
Crea el archivo `.env.local` en la raíz del proyecto:

```dotenv
DATABASE_URL="postgresql://..."         # Del paso 1.2
RESEND_API_KEY="re_..."                 # Del paso 1.3
RESEND_FROM="no-reply@send.dominiocliente.com"
OPENAI_API_KEY="sk-proj-..."            # Reutilizable entre clientes
SCAN_REPORT_SECRET="genera-uno-nuevo"   # Ver paso 2.2
RAFFLE_ADMIN_KEY="genera-uno-nuevo"     # Ver paso 2.2
```

### 2.2 Generar secretos nuevos
En la terminal del proyecto:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → pega como SCAN_REPORT_SECRET

node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
# → pega como RAFFLE_ADMIN_KEY
```

### 2.3 Logos
1. Coloca los logos en `public/logos/`:
   - `[producto]-logo.png` — logo del producto/marca (fondo transparente o blanco)
   - `[cliente]-logo.png` — logo del cliente (aparece en footer de correos)
2. Actualiza las referencias en:
   - `src/app/api/prospects/route.ts` → línea con `threatdown-logo.png`
   - `src/app/api/scan-report/route.ts` → líneas con `threatdown-logo.png` y `synappssys-logo.png`
   - `src/app/sorteo/page.tsx` → `src="/logos/threatdown-logo.png"`

### 2.4 Textos del formulario
Archivo: `src/app/registro/page.tsx` (o `src/app/page.tsx`)

Cambia:
- Nombre del evento
- Descripción del producto
- Preguntas `pregunta_cerrada_1` y `pregunta_cerrada_2` (opciones del select)
- Placeholder del campo `dolor_reto`

### 2.5 Textos del correo de confirmación
Archivo: `src/app/api/prospects/route.ts`

Busca el bloque `html: \`` y ajusta:
- Nombre del evento: `iSEC Infosecurity` → nombre del cliente
- Nombre del producto: `ThreatDown` → producto nuevo
- Nombre de la empresa: `SynAppsSys` → empresa que organiza
- Número de premios si cambia (actualmente 4)

### 2.6 Prompt de OpenAI para el reporte DNS
Archivo: `src/app/api/scan-report/route.ts`

Busca el bloque `messages:` y ajusta:
- `System prompt`: cambia "SynAppsSys" por el nombre de la empresa
- `User prompt`: cambia "ThreatDown by Malwarebytes" por el producto nuevo
- Tono y enfoque según el tipo de prospecto esperado

Ejemplo actual:
```
"Eres un consultor senior de ciberseguridad de SynAppsSys..."
"...ThreatDown by Malwarebytes puede ayudarle a cerrarlas."
```

### 2.7 Colores de marca (opcional)
Archivo: `src/app/globals.css`

El color principal es `#162036` (azul marino). Cámbialo por el color del cliente en:
- Headers de correos (en `route.ts`)
- Clases CSS del formulario

---

## FASE 3 — Deploy en Netlify

### 3.1 Crear nuevo sitio
1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Conecta el nuevo repositorio de GitHub
3. Framework: **Next.js** (se detecta automáticamente)
4. Clic **Deploy site**

### 3.2 Variables de entorno en Netlify
`Site configuration → Environment variables → Add a variable`

Agrega las **6 variables** del `.env.local`:
| Variable | Notas |
|----------|-------|
| `DATABASE_URL` | Nueva por cliente |
| `RESEND_API_KEY` | Nueva por cliente |
| `RESEND_FROM` | Nueva por cliente |
| `OPENAI_API_KEY` | Puedes reutilizar la misma |
| `SCAN_REPORT_SECRET` | Nueva por cliente |
| `RAFFLE_ADMIN_KEY` | Nueva por cliente — anótala, la necesitas el día del evento |

### 3.3 Dominio personalizado
`Domain management → Add a domain`
1. Escribe el dominio: ej. `registro.eventofortinet.com`
2. En Cloudflare del cliente: agrega registro CNAME apuntando a Netlify
3. Netlify activa SSL automáticamente (Let's Encrypt)

### 3.4 Redeploy final
Después de agregar las variables:
`Deploys → Trigger deploy → Deploy site`

---

## FASE 4 — Verificación antes del evento

### Checklist de prueba
- [ ] Registrar con correo empresarial real → llega correo de confirmación con folio
- [ ] Esperar ~20-30 seg → llega correo de reporte DNS con análisis IA
- [ ] Verificar que el botón de Calendly pre-llena nombre y correo
- [ ] Abrir `/sorteo` en pantalla grande — se ve la pantalla pública
- [ ] Abrir `/sorteo/control` en celular — fondo negro, banda 🔐
- [ ] Ingresar `RAFFLE_ADMIN_KEY` → botón verde se habilita
- [ ] Sortear un ganador de prueba → aparece en `/sorteo`
- [ ] **Limpiar resultados de prueba** (ver abajo)

### Limpiar resultados de prueba
Ejecuta en la terminal del proyecto:
```bash
node -e "
const { neon } = require('@neondatabase/serverless');
require('fs').readFileSync('.env.local','utf8').split('\n').forEach(l=>{
  const m=l.match(/^([A-Z_]+)=\"(.+)\"$/);if(m)process.env[m[1]]=m[2];
});
const sql = neon(process.env.DATABASE_URL);
Promise.all([
  sql\`DELETE FROM event_raffle_winners\`,
  sql\`DELETE FROM event_prospects\`
]).then(()=>console.log('✅ Base de datos limpia')).catch(console.error);
"
```

---

## FASE 5 — El día del evento

| Qué | URL |
|-----|-----|
| Pantalla de registro (proyectar o QR) | `https://tudominio.com` |
| Pantalla pública del sorteo | `https://tudominio.com/sorteo` |
| Panel privado del sorteo (tu celular) | `https://tudominio.com/sorteo/control` |
| Dashboard administrativo | Streamlit Cloud |

### Flujo en el stand
1. El visitante escanea el QR y se registra
2. Recibe confirmación inmediata con su **folio** de sorteo
3. ~20 seg después recibe el **reporte DNS** de su empresa con análisis IA
4. La conversación gira en torno a los hallazgos — no a un folleto
5. El botón de Calendly cierra la reunión en segundos

### Al momento del sorteo
1. Abre `/sorteo` en la pantalla grande del stand
2. Abre `/sorteo/control` en tu celular
3. Ingresa la `RAFFLE_ADMIN_KEY`
4. Presiona el botón **4 veces** → sortea 4°, 3°, 2°, 1° lugar (el 1ro al último)
5. La pantalla grande se actualiza sola cada 2.5 segundos

---

## Resumen de archivos a modificar por cliente nuevo

| Archivo | Qué cambiar |
|---------|-------------|
| `.env.local` | Todas las variables |
| `public/logos/` | Logos del cliente y producto |
| `src/app/api/prospects/route.ts` | Textos del correo de confirmación |
| `src/app/api/scan-report/route.ts` | Logos, prompt de OpenAI, textos del reporte |
| `src/app/registro/page.tsx` | Nombre evento, preguntas, descripción |
| `src/app/sorteo/page.tsx` | Logo en pantalla pública del sorteo |

**Total estimado: 2–3 horas para cliente completamente nuevo.**
