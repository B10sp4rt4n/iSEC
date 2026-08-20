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

// Entradas ficticias para poblar el CRM desde el inicio
const FAKE_ENTRIES: Prospect[] = [
  { id: "f1", nombre: "Valeria Ibarra",    empresa: "Manufacturera Noreste", cargo: "Directora de TI",      created_at: "", isFake: true },
  { id: "f2", nombre: "Marcos Delgado",    empresa: "Grupo Comersa",          cargo: "Gerente de Operaciones", created_at: "", isFake: true },
  { id: "f3", nombre: "Fernanda Quiroz",   empresa: "Banca Ágil",             cargo: "CISO",                 created_at: "", isFake: true },
  { id: "f4", nombre: "Ernesto Villanueva",empresa: "Distribuidora Central",  cargo: "VP Comercial",         created_at: "", isFake: true },
  { id: "f5", nombre: "Patricia Salinas",  empresa: "TecnoServ MX",           cargo: "CTO",                  created_at: "", isFake: true },
  { id: "f6", nombre: "Rodrigo Peña",      empresa: "Logística Express",      cargo: "Director General",     created_at: "", isFake: true },
];

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  return `hace ${Math.floor(diff / 3600)} h`;
}

function Row({ p, index }: { p: Prospect; index: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 120);
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
      transition: "opacity .35s ease, transform .35s ease",
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
  const [count, setCount] = useState(FAKE_ENTRIES.length);
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
        setCount(prev => prev + fresh.length);
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
        // Quitar badge "Nuevo" después de 6 s
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

  const all = [...real, ...FAKE_ENTRIES];

  return (
    <main style={{ minHeight: "100vh", background: "#0A111E", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "system-ui,sans-serif", fontWeight: 800, fontSize: 17, color: "rgba(237,240,244,.8)", letterSpacing: ".06em" }}>
            LEAD<span style={{ color: "#F0A020" }}>FRAME</span>
            <span style={{ fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,.25)", marginLeft: 8 }}>CRM Demo</span>
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
            color: "#4DC4BB",
            background: "rgba(46,122,116,.2)", border: "1px solid rgba(46,122,116,.4)",
            borderRadius: 4, padding: "4px 10px",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#4DC4BB",
              animation: "blink 1.4s ease infinite",
            }} />
            EN VIVO
          </span>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.3)", lineHeight: 1.5 }}>
          Simulación ilustrativa · Los registros reales aparecen destacados en ámbar
        </p>
      </div>

      {/* Stats */}
      <div style={{ width: "100%", maxWidth: 560, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { n: count, l: "Registros" },
          { n: real.length, l: "En esta sesión" },
          { n: 3, l: "Premios activos" },
        ].map(({ n, l }) => (
          <div key={l} style={{
            background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 10, padding: "16px 14px",
            transition: "background .3s",
          }}>
            <div style={{
              fontFamily: "system-ui,sans-serif", fontSize: 28, fontWeight: 800,
              color: pulse && l === "Registros" ? "#F0C060" : "#F0A020",
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
              transition: "color .3s",
            }}>{n}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 5 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Feed */}
      <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.25)", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,.06)", marginBottom: 4 }}>
          Prospectos registrados
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
          fontWeight: 700, fontSize: 13, letterSpacing: ".04em",
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
