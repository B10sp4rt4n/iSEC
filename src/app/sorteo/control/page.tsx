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
    <main className="min-h-screen p-6 md:p-12" style={{background:"#0f172a"}}>
      <section className="mx-auto w-full max-w-3xl">

        {/* Banda de identificación */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-yellow-400 bg-yellow-400/10 px-5 py-3">
          <span className="text-2xl">🔐</span>
          <div>
            <p className="font-bold text-yellow-300 text-sm uppercase tracking-widest">Panel privado del organizador</p>
            <p className="text-xs text-yellow-200/70">Pantalla interna — no proyectar al público</p>
          </div>
        </div>

        <article className="rounded-3xl border border-slate-700 bg-slate-800 p-8 md:p-10">
          <h1 className="mb-1 text-3xl font-bold text-white">Control de sorteo</h1>
          <p className="mb-6 text-sm text-slate-400">
            Proyecta en la pantalla grande la vista pública:&nbsp;
            <Link href="/sorteo" className="font-semibold text-emerald-400 underline" target="_blank">
              /sorteo ↗
            </Link>
          </p>

          <label className="mb-5 block text-sm font-medium text-slate-300">
            Clave de administrador
            <input
              type="password"
              className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Ingresa tu RAFFLE_ADMIN_KEY"
            />
          </label>

          <button
            type="button"
            onClick={drawOneWinner}
            disabled={!canDraw}
            className="w-full rounded-xl bg-emerald-500 px-6 py-5 text-xl font-bold text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "⏳ Sorteando..." : "🎲 Sortear siguiente ganador"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-400">{status}</p>

          <div className="mt-6 rounded-2xl border border-slate-600 bg-slate-900 p-5">
            <p className="mb-3 text-sm font-semibold text-emerald-400">Ganadores sorteados</p>
            {winners.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay ganadores.</p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-200">
                {winners.map((winner) => (
                  <li key={winner.prize_position} className="flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-2">
                    <span className="font-mono font-bold text-emerald-400">#{String(winner.folio ?? "-").padStart(4, "0")}</span>
                    <span className="text-yellow-300 font-semibold">{winner.prize_position}°</span>
                    {winner.nombre} — <span className="text-slate-400">{winner.empresa}</span>
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
