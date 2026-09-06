import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

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
  const resend = new Resend(resendKey);
  const { data, error } = await resend.emails.send(
    {
      from: "LeadFrame by SynAppsSys <contacto@synappssys.com>",
      to: parsed.data.correo,
      subject: `${parsed.data.nombre.split(/\s+/)[0]}, tu señal fue incorporada por LeadFrame`,
      html: buildConfirmationEmail(parsed.data),
    },
    { idempotencyKey: `extreme-event/${payloadHash}` },
  );

  if (error || !data?.id) {
    console.error("[LeadFrame Extreme email]", error);
    return NextResponse.json({ error: "No pudimos enviar el correo. Intenta nuevamente." }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
