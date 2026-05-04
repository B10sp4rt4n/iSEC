# iSEC — Instrucciones para GitHub Copilot

## Knowledge Base de errores resueltos

Este proyecto mantiene una base de conocimiento de errores documentados en la tabla
`dev_knowledge_base` de Neon (misma conexión que `DATABASE_URL`).

### REGLA OBLIGATORIA: Consultar KB antes de diagnosticar cualquier error

Cuando el usuario reporte un error, un 500, un crash o cualquier comportamiento inesperado:

1. **Primero** consulta el endpoint de búsqueda:
   ```
   GET /api/kb/search?q=<palabras clave del error>
   Header: x-admin-key: W341th-isec
   ```
   O bien ejecuta directamente en terminal:
   ```bash
   node -e "
   const { neon } = require('@neondatabase/serverless');
   const fs = require('fs');
   const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}));
   const sql = neon(env.DATABASE_URL);
   sql\`SELECT numero, titulo, causa_raiz, solucion, leccion_aprendida FROM dev_knowledge_base WHERE contexto_ia ILIKE ${'%' + '<ERROR_KEYWORD>' + '%'} OR sintoma ILIKE ${'%' + '<ERROR_KEYWORD>' + '%'} LIMIT 3\`.then(r=>console.log(JSON.stringify(r,null,2)));
   "
   ```

2. **Si hay match**: presenta el issue conocido (#NNN), la causa raíz y la solución documentada. No diagnostiques desde cero.

3. **Si no hay match**: diagnostica normalmente y al resolver, pregunta al usuario si quiere documentar el nuevo issue en la KB con `node scripts/seed-knowledge-base.mjs`.

### Estructura de un issue documentado

| Campo | Descripción |
|---|---|
| `numero` | #001, #002... |
| `titulo` | Descripción corta del problema |
| `sintoma` | Lo que el usuario ve (mensaje de error, comportamiento) |
| `causa_raiz` | Por qué ocurre técnicamente |
| `solucion` | Qué se cambió para resolverlo |
| `intentos_fallidos` | JSONB: qué se intentó y por qué falló |
| `leccion_aprendida` | Regla general para evitar el problema en el futuro |
| `patron` | Categoría: `payload_size`, `timeout`, `serialization`, etc. |
| `aplica_a` | Otros stacks/contextos donde aplica la misma lección |
| `commit_fix` | Hash del commit que lo resolvió |
| `contexto_ia` | Texto denso con keywords para búsqueda semántica |

### Para agregar un nuevo issue

Edita `scripts/seed-knowledge-base.mjs` agregando un nuevo bloque `INSERT` con el siguiente número consecutivo y ejecuta:
```bash
node scripts/seed-knowledge-base.mjs
```

---

## Stack del proyecto

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Base de datos**: Neon (PostgreSQL serverless) vía `@neondatabase/serverless`
- **Email**: Resend — usar siempre `resend.emails.send()` individual con `Promise.all` en chunks de 5 cuando hay adjuntos. **Nunca** `resend.batch.send()` con buffers grandes (ver KB #001)
- **Deploy**: Netlify Functions (timeout ~10s — operaciones largas deben ser paralelas)
- **Auth**: header `x-admin-key` con valor de `RAFFLE_ADMIN_KEY`

## Convenciones de código

- Rutas API en `src/app/api/*/route.ts`
- Cliente SQL: `getSqlClient()` de `@/lib/db`
- Variables de entorno en `.env.local` (nunca hardcodear)
