import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { getSqlClient } from "@/lib/db";

const ACTIVE_WINDOW_MINUTES = 15;
const SIMULATION_INTERVAL_MS = 3 * 60 * 1000;
const RAFFLE_INTERVAL_MS = 15 * 60 * 1000;

const SIMULATED_PROFILES = [
  { nombre: "Andrea", empresa: "Norte Retail", cargo: "Dirección de TI / CIO / CTO", verticales: ["Retail y servicios"], prioridad: "high" },
  { nombre: "Carlos", empresa: "Industrias Nova", cargo: "Gerencia de TI / Infraestructura", verticales: ["Manufactura"], prioridad: "critical" },
  { nombre: "Fernanda", empresa: "Campus Metropolitano", cargo: "Redes y Telecomunicaciones", verticales: ["Educación"], prioridad: "medium" },
  { nombre: "Luis", empresa: "Salud Integral", cargo: "Dirección de Seguridad / CISO", verticales: ["Salud"], prioridad: "high" },
  { nombre: "Mariana", empresa: "Logística Uno", cargo: "Operaciones", verticales: ["Logística y transporte"], prioridad: "explore" },
  { nombre: "Jorge", empresa: "Servicios Prisma", cargo: "Dirección General / CEO", verticales: ["Retail y servicios"], prioridad: "medium" },
  { nombre: "Elena", empresa: "Grupo Vector", cargo: "Compras / Finanzas", verticales: ["Manufactura"], prioridad: "high" },
  { nombre: "Miguel", empresa: "Red Pública Digital", cargo: "Redes y Telecomunicaciones", verticales: ["Gobierno"], prioridad: "critical" },
  { nombre: "Paola", empresa: "Conecta Partners", cargo: "Canal / Integrador", verticales: ["Otros sectores"], prioridad: "explore" },
  { nombre: "Roberto", empresa: "Centro Educativo MX", cargo: "Gerencia de TI / Infraestructura", verticales: ["Educación"], prioridad: "medium" },
] as const;

const requestSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  empresa: z.string().trim().min(2).max(120),
  cargo: z.string().trim().min(2).max(120),
  correo: z.string().trim().email().max(180),
  telefono: z.string().trim().min(7).max(40),
  verticales: z.array(z.string().trim().min(2).max(80)).min(1).max(7),
  prioridad: z.enum(["critical", "high", "medium", "explore"]),
  entryMode: z.enum(["qr", "facilitador"]),
});

const PRIORITY_LABELS = {
  critical: "Crítica · atención inmediata",
  high: "Alta · avanzar pronto",
  medium: "Media · en evaluación",
  explore: "Exploratoria · conocer posibilidades",
} as const;

async function ensurePulseTable(sql: ReturnType<typeof getSqlClient>) {
  await sql`
    CREATE TABLE IF NOT EXISTS extreme_demo_pulse (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      idempotency_key VARCHAR(64) NOT NULL UNIQUE,
      nombre VARCHAR(120) NOT NULL,
      empresa VARCHAR(120) NOT NULL,
      cargo VARCHAR(120) NOT NULL,
      verticales JSONB NOT NULL,
      prioridad VARCHAR(20) NOT NULL,
      entry_mode VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_extreme_demo_pulse_created_at
    ON extreme_demo_pulse (created_at DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS extreme_demo_raffle_reveals (
      participant_key VARCHAR(64) PRIMARY KEY,
      period_end TIMESTAMPTZ NOT NULL,
      nombre VARCHAR(120) NOT NULL,
      empresa VARCHAR(120) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_extreme_demo_raffle_period_end
    ON extreme_demo_raffle_reveals (period_end DESC)
  `;
}

async function activeRealRecords() {
  const sql = getSqlClient();
  await ensurePulseTable(sql);
  await sql`DELETE FROM extreme_demo_pulse WHERE created_at <= NOW() - INTERVAL '15 minutes'`;
  await sql`DELETE FROM extreme_demo_raffle_reveals WHERE period_end <= NOW() - INTERVAL '15 minutes'`;
  const records = await sql`
    SELECT id, nombre, empresa, cargo, verticales, prioridad, entry_mode, created_at
    FROM extreme_demo_pulse
    WHERE created_at > NOW() - INTERVAL '15 minutes'
    ORDER BY created_at ASC
  `;
  const [winner] = await sql`
    SELECT nombre, empresa, period_end
    FROM extreme_demo_raffle_reveals
    WHERE period_end <= NOW()
      AND period_end > NOW() - INTERVAL '15 minutes'
    ORDER BY period_end DESC, created_at DESC
    LIMIT 1
  `;
  return { records, winner: winner ?? null };
}

function simulatedRecords(now: number) {
  const currentBucket = Math.floor(now / SIMULATION_INTERVAL_MS);
  const records = [];
  for (let bucket = currentBucket - 4; bucket <= currentBucket; bucket += 1) {
    for (let index = 0; index < 2; index += 1) {
      const profileIndex = ((bucket * 2 + index) % SIMULATED_PROFILES.length + SIMULATED_PROFILES.length) % SIMULATED_PROFILES.length;
      const profile = SIMULATED_PROFILES[profileIndex];
      records.push({
        id: `sim-${bucket}-${index}`,
        ...profile,
        entryMode: "simulado",
        source: "simulated",
        createdAt: new Date(bucket * SIMULATION_INTERVAL_MS).toISOString(),
      });
    }
  }
  return records;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildConfirmationEmail(input: z.infer<typeof requestSchema>) {
  const nombre = escapeHtml(input.nombre);
  const empresa = escapeHtml(input.empresa);
  const cargo = escapeHtml(input.cargo);
  const verticales = input.verticales.map(escapeHtml).join(" · ");
  const prioridad = PRIORITY_LABELS[input.prioridad];
  const entry = input.entryMode === "qr" ? "QR del evento" : "captura asistida por el habilitador";

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tu señal fue incorporada</title></head>
<body style="margin:0;background:#070a12;font-family:Arial,Helvetica,sans-serif;color:#eef1fa">
  <div style="display:none;max-height:0;overflow:hidden">Tu interacción ya forma parte del Event Demand Pulse.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070a12;padding:36px 14px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
        <tr><td style="padding:0 0 22px;font-size:17px;font-weight:900;letter-spacing:.08em;color:#f3f5ff">LEAD<span style="color:#a991ff">FRAME</span></td></tr>
        <tr><td style="background:#101422;border:1px solid #29243f;border-radius:16px;padding:32px 28px">
          <p style="margin:0 0 10px;color:#a991ff;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">Interacción incorporada</p>
          <h1 style="margin:0 0 18px;color:#f3f5ff;font-size:27px;line-height:1.25">Hola, ${nombre}.</h1>
          <p style="margin:0 0 22px;color:#a6aec2;font-size:15px;line-height:1.65">Tu participación en la experiencia de <strong style="color:#eef1fa">Extreme Networks</strong> ya fue recibida por LeadFrame y se incorporó a la lectura del evento.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d17;border:1px solid #23283a;border-radius:11px;padding:18px">
            <tr><td style="padding:0 0 7px;color:#707b92;font-size:12px;text-transform:uppercase">Perfil</td></tr>
            <tr><td style="padding:0 0 16px;color:#eef1fa;font-size:14px">${empresa} · ${cargo}</td></tr>
            <tr><td style="padding:0 0 7px;color:#707b92;font-size:12px;text-transform:uppercase">Sector o sectores</td></tr>
            <tr><td style="padding:0 0 16px;color:#eef1fa;font-size:14px">${verticales}</td></tr>
            <tr><td style="padding:0 0 7px;color:#707b92;font-size:12px;text-transform:uppercase">Prioridad declarada</td></tr>
            <tr><td style="color:#eef1fa;font-size:14px">${prioridad}</td></tr>
          </table>
          <p style="margin:22px 0 0;color:#7d879d;font-size:13px;line-height:1.6">La perspectiva mostrada en la demostración es parcial y utiliza información simulada. Este mensaje confirma únicamente la recepción de tu interacción.</p>
        </td></tr>
        <tr><td style="padding:20px 6px 0;color:#59637a;font-size:11px;line-height:1.5;text-align:center">LeadFrame by SynAppsSys · Recibiste este correo después de ingresar mediante ${entry}.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildWinnerEmail(input: z.infer<typeof requestSchema>) {
  const nombre = escapeHtml(input.nombre);
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ganador de la dinámica LeadFrame</title></head>
<body style="margin:0;background:#070a12;font-family:Arial,Helvetica,sans-serif;color:#eef1fa">
  <div style="display:none;max-height:0;overflow:hidden">Tu registro resultó ganador en la dinámica de demostración.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070a12;padding:36px 14px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
        <tr><td style="padding:0 0 22px;font-size:17px;font-weight:900;letter-spacing:.08em;color:#f3f5ff">LEAD<span style="color:#a991ff">FRAME</span></td></tr>
        <tr><td style="background:linear-gradient(145deg,#241947,#101422);border:1px solid #514080;border-radius:16px;padding:34px 28px;text-align:center">
          <p style="margin:0 0 12px;color:#c6b7ff;font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase">Cierre de la dinámica</p>
          <h1 style="margin:0 0 16px;color:#ffffff;font-size:29px;line-height:1.25">¡Felicidades, ${nombre}!</h1>
          <p style="margin:0 0 20px;color:#d5cfee;font-size:17px;line-height:1.55">Tu registro resultó ganador de un premio en la dinámica de demostración de LeadFrame.</p>
          <div style="background:#0a0d17;border:1px solid #33294f;border-radius:11px;padding:18px;color:#a6aec2;font-size:14px;line-height:1.6">Acércate con el habilitador del evento para cerrar la experiencia.</div>
          <p style="margin:20px 0 0;color:#817797;font-size:12px;line-height:1.55">Esta selección forma parte de una simulación y no corresponde a una rifa pública ni a una promoción comercial.</p>
        </td></tr>
        <tr><td style="padding:20px 6px 0;color:#59637a;font-size:11px;text-align:center">LeadFrame by SynAppsSys · Extreme Networks Event Demo</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "El servicio de correo no está disponible." }, { status: 503 });
  }

  const payloadHash = createHash("sha256")
    .update(JSON.stringify(parsed.data))
    .digest("hex")
    .slice(0, 32);
  const now = Date.now();
  const raffleEndsAt = (Math.floor(now / RAFFLE_INTERVAL_MS) + 1) * RAFFLE_INTERVAL_MS;
  const firstName = parsed.data.nombre.split(/\s+/)[0].replace(/[\r\n\t]/g, " ");
  try {
    const resend = new Resend(resendKey);
    const { data, error } = await resend.emails.send(
      {
        from: "LeadFrame by SynAppsSys <contacto@synappssys.com>",
        to: parsed.data.correo,
        subject: `${firstName}, tu señal fue incorporada por LeadFrame`,
        html: buildConfirmationEmail(parsed.data),
      },
      { idempotencyKey: `extreme-event/${payloadHash}` },
    );

    if (error || !data?.id) {
      console.error("[LeadFrame Extreme email]", error);
      return NextResponse.json({ error: "No pudimos enviar el correo. Intenta nuevamente." }, { status: 502 });
    }

    const { data: winnerData, error: winnerError } = await resend.emails.send(
      {
        from: "LeadFrame by SynAppsSys <contacto@synappssys.com>",
        to: parsed.data.correo,
        subject: `${firstName}, ganaste la dinámica de demostración LeadFrame`,
        html: buildWinnerEmail(parsed.data),
        scheduledAt: new Date(raffleEndsAt).toISOString(),
      },
      { idempotencyKey: `extreme-raffle/${payloadHash}` },
    );

    if (winnerError || !winnerData?.id) {
      console.error("[LeadFrame Extreme raffle schedule]", winnerError);
      return NextResponse.json({ error: "No pudimos programar el cierre de la experiencia. Intenta nuevamente." }, { status: 502 });
    }

    const sql = getSqlClient();
    await ensurePulseTable(sql);
    await sql`DELETE FROM extreme_demo_pulse WHERE created_at <= NOW() - INTERVAL '15 minutes'`;
    await sql`
      INSERT INTO extreme_demo_pulse (
        idempotency_key, nombre, empresa, cargo, verticales, prioridad, entry_mode
      ) VALUES (
        ${payloadHash}, ${parsed.data.nombre}, ${parsed.data.empresa}, ${parsed.data.cargo},
        ${JSON.stringify(parsed.data.verticales)}::jsonb, ${parsed.data.prioridad}, ${parsed.data.entryMode}
      )
      ON CONFLICT (idempotency_key) DO UPDATE SET created_at = NOW()
    `;
    await sql`
      INSERT INTO extreme_demo_raffle_reveals (participant_key, period_end, nombre, empresa)
      VALUES (${payloadHash}, ${new Date(raffleEndsAt).toISOString()}, ${firstName}, ${parsed.data.empresa})
      ON CONFLICT (participant_key) DO UPDATE SET period_end = EXCLUDED.period_end
    `;

    return NextResponse.json({ ok: true, raffleEndsAt: new Date(raffleEndsAt).toISOString() }, { status: 201 });
  } catch (error) {
    console.error("[LeadFrame Extreme capture]", error);
    return NextResponse.json({ error: "No pudimos completar la interacción. Intenta nuevamente." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const now = Date.now();
    const { records: realRows, winner } = await activeRealRecords();
    const realRecords = realRows.map((row) => ({
      id: String(row.id),
      nombre: String(row.nombre).split(/\s+/)[0],
      empresa: String(row.empresa),
      cargo: String(row.cargo),
      verticales: Array.isArray(row.verticales) ? row.verticales : [],
      prioridad: String(row.prioridad),
      entryMode: String(row.entry_mode),
      source: "real",
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
    const records = [...simulatedRecords(now), ...realRecords]
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    const raffleEndsAt = (Math.floor(now / RAFFLE_INTERVAL_MS) + 1) * RAFFLE_INTERVAL_MS;

    return NextResponse.json({
      records,
      activeCount: records.length,
      realCount: realRecords.length,
      simulatedCount: records.length - realRecords.length,
      activeWindowMinutes: ACTIVE_WINDOW_MINUTES,
      simulationIntervalMinutes: 3,
      raffleEndsAt: new Date(raffleEndsAt).toISOString(),
      lastWinner: winner ? {
        nombre: String(winner.nombre),
        empresa: String(winner.empresa),
        revealedAt: new Date(String(winner.period_end)).toISOString(),
      } : null,
      serverNow: new Date(now).toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[LeadFrame Extreme viewer]", error);
    return NextResponse.json({ error: "El viewer no está disponible temporalmente." }, { status: 500 });
  }
}
