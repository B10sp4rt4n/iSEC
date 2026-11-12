import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { Resend } from "resend";
import { getSqlClient, ensureEventSchema } from "@/lib/db";
import {
  buildAidrHtml,
  AIDR_SUBJECT,
  AIDR_FROM,
  AIDR_REPLY_TO,
  AIDR_PDF,
} from "@/lib/campaigns/aidr";

const CHANNEL_CARGOS = new Set([
  "reseller", "reseller_ventas", "reseller_preventa", "reseller_gerente",
  "vendor_am", "vendor_se", "vendor_channel", "vendor_mktg",
]);

const EXCLUDE_EMAILS = new Set([
  "sruiz@synappssys.com",
  "salvador.ruizesparza.mx@gmail.com",
  "b10sp4rt4n@gmail.com",
]);

const ALWAYS_INCLUDE: { correo: string; nombre: string }[] = [];

const SUMMARY_RECIPIENTS = ["salvador.ruiz@synappssys.com"];
const BATCH_SIZE = 5;

const bodySchema = z.union([
  z.object({ campaign: z.literal("aidr"), mode: z.literal("test"), test_to: z.string().email().optional() }),
  z.object({ campaign: z.literal("aidr"), mode: z.literal("broadcast") }),
]);

function isAuthorized(request: Request): boolean {
  const key = process.env.RAFFLE_ADMIN_KEY;
  return !!key && request.headers.get("x-admin-key") === key;
}

type ProspectRow = { id: string; nombre: string; correo: string; cargo: string };

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY no configurado." }, { status: 500 });
  }

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos.", detail: parsed.error.flatten() }, { status: 400 });
  }

  const resend = new Resend(resendKey);

  const attachments: { filename: string; content: Buffer }[] = [];
  try {
    const pdfPath = join(process.cwd(), AIDR_PDF);
    attachments.push({ filename: "ThreatDown AIDR.pdf", content: readFileSync(pdfPath) });
  } catch {
    // PDF opcional — se envía sin adjunto si no se encuentra
  }

  const body = parsed.data;

  // ── Test ─────────────────────────────────────────────────────────────────
  if (body.mode === "test") {
    const to = body.test_to ?? "salvador.ruiz@synappssys.com";
    const { data, error } = await resend.emails.send({
      from: AIDR_FROM,
      to,
      replyTo: AIDR_REPLY_TO,
      subject: `[TEST] ${AIDR_SUBJECT}`,
      html: buildAidrHtml(to),
      attachments,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, mode: "test", sent_to: to, id: data?.id });
  }

  // ── Broadcast ─────────────────────────────────────────────────────────────
  const sql = getSqlClient();
  await ensureEventSchema(sql);

  const all = (await sql`
    SELECT id, nombre, correo, cargo
    FROM event_prospects
    ORDER BY created_at ASC
  `) as ProspectRow[];

  const seen = new Set<string>();
  const targets = all.filter((p) => {
    const email = p.correo.toLowerCase().trim();
    if (CHANNEL_CARGOS.has(p.cargo) || EXCLUDE_EMAILS.has(email) || seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  // Agregar destinatarios fijos que no estén ya en la lista
  const seenInTargets = new Set(targets.map((t) => t.correo.toLowerCase()));
  for (const r of ALWAYS_INCLUDE) {
    if (!seenInTargets.has(r.correo.toLowerCase())) {
      targets.push({ id: "", nombre: r.nombre, correo: r.correo, cargo: "" });
    }
  }

  const results: { correo: string; ok: boolean; id?: string; error?: string }[] = [];

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const chunk = targets.slice(i, i + BATCH_SIZE);
    const chunkResults = await Promise.all(
      chunk.map((p) =>
        resend.emails.send({
          from: AIDR_FROM,
          to: p.correo,
          replyTo: AIDR_REPLY_TO,
          subject: AIDR_SUBJECT,
          html: buildAidrHtml(p.correo),
          attachments,
        }).then(({ data, error }) => ({
          correo: p.correo,
          ok: !error && !!data?.id,
          id: data?.id,
          error: error?.message,
        }))
      ),
    );
    results.push(...chunkResults);
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const sentDate = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

  const summaryHtml = `
<table style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <tr><td style="background:#0D1B3E;padding:20px 28px">
    <p style="margin:0;color:#63D89A;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">SynAppsSys — Reporte de Campaña AIDR</p>
  </td></tr>
  <tr><td style="padding:24px 28px">
    <p style="margin:0 0 6px;font-size:13px;color:#334155"><strong>Asunto:</strong> ${AIDR_SUBJECT}</p>
    <p style="margin:0 0 6px;font-size:13px;color:#334155"><strong>Fecha:</strong> ${sentDate}</p>
    <p style="margin:0 0 18px;font-size:13px;color:#334155"><strong>Fuente:</strong> Base de datos de prospectos</p>
    <table style="border-collapse:collapse;width:100%">
      <tr style="background:#f1f5f9">
        <td style="padding:10px 14px;font-size:13px;font-weight:700">✅ Enviados</td>
        <td style="padding:10px 14px;font-size:22px;font-weight:800;color:#16a34a">${sent}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-size:13px;font-weight:700">❌ Fallidos</td>
        <td style="padding:10px 14px;font-size:22px;font-weight:800;color:#dc2626">${failed}</td>
      </tr>
    </table>
    ${failed > 0 ? `<p style="margin:18px 0 6px;font-size:12px;color:#dc2626;font-weight:700">FALLIDOS:</p>
    <p style="margin:0;font-size:12px;color:#dc2626;line-height:1.8">${results.filter(r => !r.ok).map(r => r.correo).join("<br>")}</p>` : ""}
  </td></tr>
</table>`;

  await resend.emails.send({
    from: AIDR_FROM,
    to: SUMMARY_RECIPIENTS,
    subject: `[Reporte AIDR] Campaña enviada — ${sent} destinatarios · ${sentDate}`,
    html: summaryHtml,
  });

  return NextResponse.json({ ok: true, mode: "broadcast", sent, failed, total: targets.length, results });
}
