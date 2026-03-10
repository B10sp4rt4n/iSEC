"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Winner = {
  prize_position: number;
  nombre: string;
  empresa: string;
  correo: string;
};

type RaffleState = {
  winners: Winner[];
  completed: boolean;
};

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) {
    return email;
  }

  if (name.length <= 2) {
    return `${name[0] ?? "*"}***@${domain}`;
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

export default function SorteoPage() {
  const [state, setState] = useState<RaffleState>({ winners: [], completed: false });
  const [loading, setLoading] = useState(true);

  async function loadState() {
    const response = await fetch("/api/sorteo", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("No se pudo obtener estado del sorteo");
    }

    const data = (await response.json()) as RaffleState;
    setState({
      winners: data.winners ?? [],
      completed: Boolean(data.completed),
    });
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        await loadState();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap().catch(console.error);

    const timer = setInterval(() => {
      loadState().catch(console.error);
    }, 2500);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const title = useMemo(() => {
    if (loading) return "Preparando sorteo...";
    if (state.completed) return "Sorteo finalizado";
    if (state.winners.length === 0) return "Listos para iniciar el sorteo";
    return "Ganadores confirmados";
  }, [loading, state.completed, state.winners.length]);

  return (
    <main className="mesh-bg min-h-screen p-6 md:p-12">
      <section className="mx-auto w-full max-w-5xl">
        <article className="card rounded-3xl p-8 md:p-12">
          <div className="mb-3 flex items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
              iSEC Infosecurity
            </p>
            <Image
              src="/logos/threatdown-logo.png"
              alt="ThreatDown logo"
              width={120}
              height={32}
              className="object-contain"
            />
          </div>
          <h1 className="title-font mb-4 text-4xl font-bold text-[#162036] md:text-5xl">
            Sorteo de cierre del evento
          </h1>
          <p className="mb-8 text-lg text-slate-700">{title}</p>

          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((position) => {
              const winner = state.winners.find((item) => item.prize_position === position);
              return (
                <div
                  key={position}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm font-semibold text-emerald-700">Premio {position}</p>
                  {winner ? (
                    <>
                      <p className="mt-2 text-xl font-bold text-[#162036]">{winner.nombre}</p>
                      <p className="text-sm text-slate-600">{winner.empresa}</p>
                      <p className="mt-1 text-xs text-slate-500">{maskEmail(winner.correo)}</p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Pendiente de sortear</p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Pantalla publica del sorteo. El boton de seleccion se usa solo en el panel privado.
          </p>
        </article>
      </section>
    </main>
  );
}
