import { NextResponse } from "next/server";
import { ensureEventSchema, getSqlClient } from "@/lib/db";

type WinnerRow = {
  prize_position: number;
  nombre: string;
  empresa: string;
  correo: string;
};

type DrawRow = {
  id: string;
  prospect_id: string;
  prize_position: number;
  created_at: string;
  nombre: string;
  empresa: string;
  correo: string;
};

const MAX_WINNERS = 3;

function isAuthorized(request: Request) {
  const adminKey = process.env.RAFFLE_ADMIN_KEY;
  if (!adminKey) {
    return false;
  }

  const provided = request.headers.get("x-admin-key");
  return Boolean(provided && provided === adminKey);
}

export async function GET() {
  try {
    const sql = getSqlClient();
    await ensureEventSchema(sql);

    const winnersResult = await sql`
      SELECT
        w.prize_position,
        p.nombre,
        p.empresa,
        p.correo
      FROM event_raffle_winners w
      INNER JOIN event_prospects p ON p.id = w.prospect_id
      ORDER BY w.prize_position ASC;
    `;
    const winners = winnersResult as WinnerRow[];

    return NextResponse.json(
      {
        ok: true,
        winners,
        completed: winners.length >= MAX_WINNERS,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Error al consultar sorteo", error);
    const detail = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: "No se pudo consultar el sorteo", detail },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const sql = getSqlClient();
    await ensureEventSchema(sql);
    const winnerRowId = crypto.randomUUID();

    const drawResultSql = await sql`
      WITH current_count AS (
        SELECT COUNT(*)::int AS total FROM event_raffle_winners
      ),
      next_position AS (
        SELECT total + 1 AS pos FROM current_count
      ),
      unique_participants AS (
        SELECT id, nombre, empresa, correo
        FROM (
          SELECT
            p.*,
            ROW_NUMBER() OVER (
              PARTITION BY lower(p.correo)
              ORDER BY p.created_at ASC
            ) AS rn
          FROM event_prospects p
        ) t
        WHERE t.rn = 1
      ),
      eligible AS (
        SELECT up.id
        FROM unique_participants up
        LEFT JOIN event_raffle_winners w ON w.prospect_id = up.id
        WHERE w.prospect_id IS NULL
      ),
      picked AS (
        SELECT e.id
        FROM eligible e
        ORDER BY random()
        LIMIT 1
      ),
      inserted AS (
        INSERT INTO event_raffle_winners (id, prospect_id, prize_position)
        SELECT ${winnerRowId}, p.id, np.pos
        FROM picked p
        CROSS JOIN next_position np
        WHERE np.pos <= ${MAX_WINNERS}
        ON CONFLICT DO NOTHING
        RETURNING id, prospect_id, prize_position, created_at
      )
      SELECT
        i.id,
        i.prospect_id,
        i.prize_position,
        i.created_at,
        ep.nombre,
        ep.empresa,
        ep.correo
      FROM inserted i
      INNER JOIN event_prospects ep ON ep.id = i.prospect_id;
    `;
    const drawResult = drawResultSql as DrawRow[];

    const winner = drawResult[0] ?? null;

    if (!winner) {
      const winnersResult = await sql`
        SELECT
          w.prize_position,
          p.nombre,
          p.empresa,
          p.correo
        FROM event_raffle_winners w
        INNER JOIN event_prospects p ON p.id = w.prospect_id
        ORDER BY w.prize_position ASC;
      `;
      const winners = winnersResult as WinnerRow[];

      return NextResponse.json({
        ok: true,
        done: true,
        message: winners.length >= MAX_WINNERS
          ? "El sorteo ya completo los 3 premios"
          : "No hay participantes elegibles para sortear",
        winners,
      });
    }

    return NextResponse.json({
      ok: true,
      done: false,
      winner: {
        prize_position: winner.prize_position,
        nombre: winner.nombre,
        empresa: winner.empresa,
        correo: winner.correo,
      },
    });
  } catch (error) {
    console.error("Error al ejecutar sorteo", error);
    const detail = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: "No se pudo ejecutar el sorteo", detail },
      { status: 500 },
    );
  }
}
