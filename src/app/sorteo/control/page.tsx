"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Winner = {
  prize_position: number;
  nombre: string;
  empresa: string;
  correo: string;
  folio?: number | null;
};

type DrawResponse = {
  ok: boolean;
  done?: boolean;
  message?: string;
  winner?: Winner;
  winners?: Winner[];
  error?: string;
};

export default function SorteoControlPage() {
  const [adminKey, setAdminKey] = useState("");
  const [winners, setWinners] = useState<Winner[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ingresa tu clave para habilitar el boton de sorteo.");

  const canDraw = useMemo(
    () => adminKey.trim().length > 0 && !busy && winners.length < 4,
    [adminKey, busy, winners.length],
  );

  async function drawOneWinner() {
    setBusy(true);
    setStatus("Ejecutando sorteo...");

    try {
      const response = await fetch("/api/sorteo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
      });

      const data = (await response.json()) as DrawResponse;

      if (!response.ok) {
        setStatus(data.error ?? "No autorizado o error de servidor.");
        return;
      }

      if (data.winner) {
        setWinners((current) => {
          const merged = [...current, data.winner as Winner]
            .sort((a, b) => a.prize_position - b.prize_position)
            .filter((item, index, arr) =>
              arr.findIndex((x) => x.prize_position === item.prize_position) === index,
            );
          return merged;
        });
        setStatus(`Ganador del premio ${data.winner.prize_position}: ${data.winner.nombre}`);
        return;
      }

      if (Array.isArray(data.winners)) {
        setWinners(data.winners.sort((a, b) => a.prize_position - b.prize_position));
      }

      setStatus(data.message ?? "No se pudo continuar el sorteo.");
    } catch (error) {
      console.error(error);
      setStatus("Fallo de conexion al ejecutar el sorteo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mesh-bg min-h-screen p-6 md:p-12">
      <section className="mx-auto w-full max-w-3xl">
        <article className="card rounded-3xl p-8 md:p-10">
          <h1 className="title-font mb-2 text-3xl font-bold text-[#162036]">Control privado de sorteo</h1>
          <p className="mb-6 text-sm text-slate-600">
            Esta pantalla es solo para el organizador. Proyecta en publico la vista de 
            <Link href="/sorteo" className="ml-1 font-semibold text-emerald-800 underline">
              /sorteo
            </Link>
            .
          </p>

          <label className="mb-4 block text-sm font-medium text-slate-700">
            Clave de administrador (RAFFLE_ADMIN_KEY)
            <input
              type="password"
              className="field mt-2"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Ingresa tu clave"
            />
          </label>

          <button
            type="button"
            onClick={drawOneWinner}
            disabled={!canDraw}
            className="btn-primary w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Sorteando..." : "Sortear siguiente ganador"}
          </button>

          <p className="mt-4 text-sm text-slate-600">{status}</p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="mb-2 text-sm font-semibold text-emerald-700">Ganadores actuales</p>
            {winners.length === 0 ? (
              <p className="text-sm text-slate-500">Aun no hay ganadores sorteados.</p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-700">
                {winners.map((winner) => (
                  <li key={winner.prize_position} className="flex items-center gap-2">
                    <span className="font-bold text-[#162036]">#{String(winner.folio ?? "-").padStart(4, "0")}</span>
                    Premio {winner.prize_position}: {winner.nombre} ({winner.empresa})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
