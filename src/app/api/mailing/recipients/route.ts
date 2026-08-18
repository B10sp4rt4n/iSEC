import { NextResponse } from "next/server";
import { getSqlClient, ensureEventSchema } from "@/lib/db";

const CHANNEL_CARGOS = new Set([
  "reseller", "reseller_ventas", "reseller_preventa", "reseller_gerente",
  "vendor_am", "vendor_se", "vendor_channel", "vendor_mktg",
]);

const EXCLUDE_EMAILS = new Set([
  "salvador.ruiz@synappssys.com",
  "sruiz@synappssys.com",
  "salvador.ruizesparza.mx@gmail.com",
  "b10sp4rt4n@gmail.com",
]);

function isAuthorized(request: Request): boolean {
  const key = process.env.RAFFLE_ADMIN_KEY;
  return !!key && request.headers.get("x-admin-key") === key;
}

type ProspectRow = {
  id: string;
  nombre: string;
  empresa: string;
  cargo: string;
  correo: string;
  created_at: string;
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const sql = getSqlClient();
  await ensureEventSchema(sql);

  const rows = (await sql`
    SELECT id, nombre, empresa, cargo, correo, created_at
    FROM event_prospects
    ORDER BY created_at ASC
  `) as ProspectRow[];

  const excluded: ProspectRow[] = [];
  const recipients: ProspectRow[] = [];

  const seenEmails = new Set<string>();
  for (const p of rows) {
    const email = p.correo.toLowerCase().trim();
    const isDuplicate = seenEmails.has(email);
    seenEmails.add(email);
    if (CHANNEL_CARGOS.has(p.cargo) || EXCLUDE_EMAILS.has(email) || isDuplicate) {
      excluded.push(p);
    } else {
      recipients.push(p);
    }
  }

  return NextResponse.json({
    total_db: rows.length,
    to_send: recipients.length,
    excluded_count: excluded.length,
    recipients,
    excluded,
  });
}
