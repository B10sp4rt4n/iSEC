"use client";

import { useEffect, useState, useRef } from "react";

type Prospect = {
  id: string;
  nombre: string;
  empresa: string;
  cargo: string;
  created_at: string;
  isNew?: boolean;
  isFake?: boolean;
};

const FAKE_ENTRIES: Prospect[] = [
  { id: "f1", nombre: "Valeria Ibarra",     empresa: "Manufacturera Noreste", cargo: "Directora de TI",       created_at: "", isFake: true },
  { id: "f2", nombre: "Marcos Delgado",     empresa: "Grupo Comersa",         cargo: "Gerente de Operaciones", created_at: "", isFake: true },
  { id: "f3", nombre: "Fernanda Quiroz",    empresa: "Banca Ágil",            cargo: "CISO",                  created_at: "", isFake: true },
  { id: "f4", nombre: "Ernesto Villanueva", empresa: "Distribuidora Central", cargo: "VP Comercial",          created_at: "", isFake: true },
  { id: "f5", nombre: "Patricia Salinas",   empresa: "TecnoServ MX",          cargo: "CTO",                   created_at: "", isFake: true },
  { id: "f6", nombre: "Rodrigo Peña",       empresa: "Logística Express",     cargo: "Director General",      created_at: "", isFake: true },
];

// Distribución horaria simulada — total 125
const HOURLY = [
  { hora: "09:00",  n: 4  },
  { hora: "10:00",  n: 15 },
  { hora: "11:00",  n: 28 }, // keynote
  { hora: "12:00",  n: 12 },
  { hora: "13:00",  n: 6  }, // comida
  { hora: "14:00",  n: 18 },
  { hora: "15:00",  n: 24 }, // talleres
  { hora: "16:00",  n: 11 },
  { hora: "17:00",  n: 5  },
  { hora: "18:00",  n: 2  },
];
const MAX_N = Math.max(...HOURLY.map(h => h.n));
const TOTAL_DEMO = HOURLY.reduce((s, h) => s + h.n, 0);

function BarChart() {
  const [revealed, setRevealed] = useState(0); // cuántas barras están visibles
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    // Revelar una barra cada 420ms
    const timers: ReturnType<typeof setTimeout>[] = [];
    HOURLY.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealed(i + 1), 300 + i * 420));
    });
    // Contador que sube hasta TOTAL_DEMO en paralelo con las barras
    const duration = 300 + HOURLY.length * 420 + 200;
    const steps = 60;
    const stepTime = duration / steps;
    for (let s = 1; s <= steps; s++) {
      timers.push(setTimeout(() => {
        setCounter(Math.round((TOTAL_DEMO / steps) * s));
      }, s * stepTime));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: "20px 20px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.3)" }}>
          Registros por hora
        </span>
        <span style={{ fontFamily: "system-ui,sans-serif", fontSize: 26, fontWeight: 800, color: "#F0A020", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {counter}
          <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,.25)", marginLeft: 6 }}>registros</span>
        </span>
      </div>

      {/* Barras */}
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
        {HOURLY.map((h, i) => {
          const pct = (h.n / MAX_N) * 100;
          const active = i === revealed - 1;
          const done = i < revealed - 1;
          const visible = i < revealed;
          return (
            <div key={h.hora} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", position: "relative", height: 64, display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%",
                  height: visible ? `${pct}%` : "0%",
                  background: active
                    ? "#F0A020"
                    : done
                    ? "rgba(240,160,32,.35)"
                    : "rgba(255,255,255,.08)",
                  borderRadius: "3px 3px 0 0",
                  transition: "height .35s ease, background .3s",
                  position: "relative",
                }}>
                  {active && (
                    <span style={{
                      position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)",
                      fontSize: 11, fontWeight: 700, color: "#F0A020", whiteSpace: "nowrap",
                    }}>
                      {h.n}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,.2)", whiteSpace: "nowrap" }}>{h.hora.slice(0, 5)}</span>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: "rgba(255,255,255,.18)", marginTop: 12, textAlign: "right" }}>
        Simulación ilustrativa de un evento de 8 hrs
      </p>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  return `hace ${Math.floor(diff / 3600)} h`;
}

function Row({ p, index }: { p: Prospect; index: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 100);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
      background: p.isNew ? "rgba(196,125,8,.08)" : "rgba(255,255,255,.04)",
      border: `1px solid ${p.isNew ? "rgba(196,125,8,.3)" : "rgba(255,255,255,.07)"}`,
      borderRadius: 8, padding: "11px 16px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(-8px)",
      transition: "opacity .3s ease, transform .3s ease",
    }}>
      <div>
        <div style={{ fontSize: 13, color: p.isNew ? "#F0C060" : "rgba(255,255,255,.8)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          {p.nombre}
          {p.isNew && (
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", background: "rgba(196,125,8,.2)", color: "#F0A020", border: "1px solid rgba(196,125,8,.4)", borderRadius: 3, padding: "2px 7px" }}>
              Nuevo
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 3 }}>
          {p.empresa} &middot; {p.cargo}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", whiteSpace: "nowrap", flexShrink: 0 }}>
        {p.isFake ? "hace un momento" : timeAgo(p.created_at)}
      </div>
    </div>
  );
}

export default function DemoCrmPage() {
  const [real, setReal] = useState<Prospect[]>([]);
  const [pulse, setPulse] = useState(false);
  const knownIds = useRef(new Set<string>());

  async function fetchReal() {
    try {
      const res = await fetch("/api/demo/prospects");
      if (!res.ok) return;
      const data = await res.json();
      const incoming: Prospect[] = data.prospects ?? [];
      const fresh = incoming.filter(p => !knownIds.current.has(p.id));
      if (fresh.length > 0) {
        fresh.forEach(p => knownIds.current.add(p.id));
        setReal(prev => [...fresh.map(p => ({ ...p, isNew: true })), ...prev]);
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
        setTimeout(() => {
          setReal(prev => prev.map(p =>
            fresh.some(f => f.id === p.id) ? { ...p, isNew: false } : p
          ));
        }, 6000);
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchReal();
    const interval = setInterval(fetchReal, 4000);
    return () => clearInterval(interval);
  }, []);

  const realCount = real.length;
  const totalCount = TOTAL_DEMO + realCount;
  const all = [...real, ...FAKE_ENTRIES];

  return (
    <main style={{ minHeight: "100vh", background: "#0A111E", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: "system-ui,sans-serif", fontWeight: 800, fontSize: 17, color: "rgba(237,240,244,.8)", letterSpacing: ".06em" }}>
            LEAD<span style={{ color: "#F0A020" }}>FRAME</span>
            <span style={{ fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,.25)", marginLeft: 8 }}>CRM Demo</span>
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
            color: "#4DC4BB", background: "rgba(46,122,116,.2)", border: "1px solid rgba(46,122,116,.4)",
            borderRadius: 4, padding: "4px 10px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4DC4BB", animation: "blink 1.4s ease infinite" }} />
            EN VIVO
          </span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>
          Simulación ilustrativa · Registros reales destacados en ámbar
        </p>
      </div>

      {/* Gráfico */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 16 }}>
        <BarChart />
      </div>

      {/* Stats rápidas */}
      <div style={{ width: "100%", maxWidth: 560, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { n: totalCount,  l: "Total registros" },
          { n: realCount,   l: "Tú en esta sesión" },
          { n: 3,           l: "Premios activos" },
        ].map(({ n, l }) => (
          <div key={l} style={{
            background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 10, padding: "14px 12px",
          }}>
            <div style={{
              fontFamily: "system-ui,sans-serif", fontSize: 26, fontWeight: 800,
              color: pulse && l === "Total registros" ? "#F0C060" : "#F0A020",
              fontVariantNumeric: "tabular-nums", lineHeight: 1, transition: "color .3s",
            }}>{n}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 5 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Feed reciente */}
      <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.25)", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,.06)", marginBottom: 4 }}>
          Últimos registros
        </div>
        {all.map((p, i) => <Row key={p.id} p={p} index={i} />)}
      </div>

      {/* CTA */}
      <div style={{ width: "100%", maxWidth: 560, marginTop: 36, padding: "24px", background: "rgba(196,125,8,.06)", border: "1px solid rgba(196,125,8,.2)", borderRadius: 10, textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
          ¿Quieres esto en tu próximo evento?
        </p>
        <a href="/servicios" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#C47D08", color: "#0A1018",
          fontWeight: 700, fontSize: 13,
          padding: "11px 24px", borderRadius: 6, textDecoration: "none",
        }}>
          Ver planes y precios →
        </a>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: .3; }
        }
      `}</style>
    </main>
  );
}
