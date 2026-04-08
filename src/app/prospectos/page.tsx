"use client";

import { useState, useCallback } from "react";

// ─── tipos ────────────────────────────────────────────────────────────────
type Prospect = {
  id: string;
  folio: number;
  nombre: string;
  empresa: string;
  cargo: string;
  correo: string;
  telefono: string | null;
  pregunta_cerrada_1: string;
  pregunta_cerrada_2: string;
  dolor_reto: string;
  created_at: string;
};

// ─── etiquetas legibles ───────────────────────────────────────────────────
const CARGO_LABEL: Record<string, string> = {
  ciso: "CISO",
  cio_cto: "CIO / CTO",
  director_ops: "Director de Operaciones",
  director_gral: "Director General",
  gerente_ti: "Gerente de TI",
  gerente_seguridad: "Gerente de Seguridad",
  jefe_ti: "Jefe de TI",
  admin_sistemas: "Administrador de Sistemas",
  ingeniero_seguridad: "Ingeniero de Seguridad",
  analista_ti: "Analista de TI",
  reseller: "Consultor / Integrador Técnico",
  reseller_ventas: "Ejecutivo de Ventas (Canal)",
  reseller_preventa: "Preventa / Sales Engineer (Canal)",
  reseller_gerente: "Gerente de Canal / Partner Manager",
  vendor_am: "Account Manager (Vendor)",
  vendor_se: "Sales Engineer (Vendor)",
  vendor_channel: "Channel Manager (Fabricante)",
  vendor_mktg: "Marketing / Desarrollo de Negocio (Vendor)",
  otro: "Otro",
};

const RIESGO_LABEL: Record<string, string> = {
  ransomware: "Ransomware",
  phishing: "Phishing / correo malicioso",
  visibilidad: "Falta de visibilidad sobre equipos",
  navegacion: "Navegación a sitios riesgosos",
};

const DETECCION_LABEL: Record<string, string> = {
  no: "No tiene capacidad de detección",
  no_seguro: "No está seguro",
  si: "Sí tiene capacidad",
};

// ─── postura de seguridad derivada de respuestas ──────────────────────────
type Postura = {
  label: string;
  nivel: "critica" | "alta" | "media" | "basica";
  puntos: number;
};

function calcPostura(p1: string, p2: string): Postura {
  const riskScore: Record<string, number> = {
    ransomware: 10, phishing: 8, visibilidad: 5, navegacion: 3,
  };
  const detScore: Record<string, number> = { no: 10, no_seguro: 7, si: 2 };
  const puntos = (riskScore[p1] ?? 5) + (detScore[p2] ?? 5);

  if (puntos >= 16) return { label: "Exposición Crítica", nivel: "critica", puntos };
  if (puntos >= 13) return { label: "Exposición Alta", nivel: "alta", puntos };
  if (puntos >= 9)  return { label: "Exposición Media", nivel: "media", puntos };
  return { label: "Postura Razonable", nivel: "basica", puntos };
}

const POSTURA_STYLE: Record<string, { ring: string; bg: string; text: string; badge: string }> = {
  critica: { ring: "#ef4444", bg: "#450a0a", text: "#fca5a5", badge: "#7f1d1d" },
  alta:    { ring: "#f97316", bg: "#431407", text: "#fdba74", badge: "#7c2d12" },
  media:   { ring: "#eab308", bg: "#422006", text: "#fde047", badge: "#713f12" },
  basica:  { ring: "#22c55e", bg: "#052e16", text: "#86efac", badge: "#14532d" },
};

// ─── prioridad de contacto ────────────────────────────────────────────────
function getPrioridad(postura: Postura, cargo: string): { label: string; color: string } {
  const isChannel = cargo.startsWith("reseller") || cargo.startsWith("vendor");
  if (isChannel) return { label: "Canal", color: "#818cf8" };
  if (postura.nivel === "critica") return { label: "PRIORIDAD 1 — Urgente", color: "#f87171" };
  if (postura.nivel === "alta")    return { label: "PRIORIDAD 2 — Esta semana", color: "#fb923c" };
  if (postura.nivel === "media")   return { label: "PRIORIDAD 3 — Próximas 2 sem.", color: "#facc15" };
  return { label: "PRIORIDAD 4 — Nurture", color: "#4ade80" };
}

// ─── generador del mensaje de approach ───────────────────────────────────
function buildApproach(p: Prospect): string {
  const { nombre, empresa, cargo, pregunta_cerrada_1, pregunta_cerrada_2, dolor_reto } = p;

  const seniorSec = ["ciso", "gerente_seguridad", "ingeniero_seguridad"];
  const directivos = ["cio_cto", "director_ops", "director_gral"];
  const itOps     = ["gerente_ti", "jefe_ti", "admin_sistemas", "analista_ti"];
  const channel   = ["reseller", "reseller_ventas", "reseller_preventa", "reseller_gerente",
                     "vendor_am", "vendor_se", "vendor_channel", "vendor_mktg"];

  let intro = "";
  if (seniorSec.includes(cargo)) {
    intro = `Hola ${nombre}, como responsable de seguridad en ${empresa}, sabemos que cada decisión tiene que estar respaldada por datos concretos y tiempo de contención mínimo. `;
  } else if (directivos.includes(cargo)) {
    intro = `Hola ${nombre}, entendemos que en ${empresa} la continuidad operativa y la exposición al riesgo son temas que te impactan directamente en resultados. `;
  } else if (itOps.includes(cargo)) {
    intro = `Hola ${nombre}, el equipo de TI en ${empresa} carga con la responsabilidad de que todo funcione y esté seguro — y sabemos que los recursos son limitados. `;
  } else if (channel.includes(cargo)) {
    intro = `Hola ${nombre}, nos alegra que te hayas acercado. Queremos explorar cómo podemos trabajar juntos para llevar ThreatDown a más clientes y crear oportunidades para tu negocio. `;
  } else {
    intro = `Hola ${nombre}, gracias por tomarte el tiempo en el evento. `;
  }

  const riskMsg: Record<string, string> = {
    ransomware:
      `Nos comentaste que el ransomware es tu mayor preocupación: ThreatDown bloquea ataques de ransomware en tiempo real con rollback automático de archivos, reduciendo el tiempo de recuperación de días a minutos. `,
    phishing:
      `Mencionaste que el phishing y el correo malicioso son tu riesgo número uno: ThreatDown analiza el comportamiento de cada proceso y bloquea las cargas maliciosas antes de que causen daño, aunque el correo pase el filtro inicial. `,
    visibilidad:
      `Nos dijiste que la falta de visibilidad sobre tus equipos es el problema central: ThreatDown te da un panel unificado con visibilidad completa de cada endpoint, alerta y evento — en tiempo real. `,
    navegacion:
      `Nos comentaste que la navegación a sitios riesgosos es una preocupación: ThreatDown incluye protección DNS y filtrado web que corta el acceso a dominios maliciosos antes de que la conexión se establezca. `,
  };

  const detMsg: Record<string, string> = {
    no:
      `Además, actualmente no cuentan con forma de detectar qué ocurrió dentro de los equipos cuando pasa algo sospechoso — eso significa que un incidente podría estar activo días sin que nadie lo sepa. `,
    no_seguro:
      `También mencionaste que no estás seguro si tienen capacidad de detección real — esa incertidumbre es en sí misma una señal de alerta que vale la pena resolver hoy. `,
    si:
      `Aunque ya tienen alguna capacidad de detección, ThreatDown eleva esa cobertura con contexto forense, automatización de respuesta y velocidad de contención muy superior a las soluciones tradicionales. `,
  };

  const painSnippet = dolor_reto.length > 0
    ? `Entendemos además que tu principal reto es: "${dolor_reto.substring(0, 120)}${dolor_reto.length > 120 ? "…" : ""}". Eso es exactamente el tipo de escenario donde ThreatDown marca la diferencia. `
    : "";

  const cta = channel.includes(cargo)
    ? `¿Tienes 20 minutos esta semana para hablar sobre cómo podemos colaborar y qué soporte de preventa podemos darte para arrancar?`
    : `¿Tienes 20 minutos esta semana para que te mostremos cómo ThreatDown resuelve esto específicamente en ${empresa}?`;

  return `${intro}${riskMsg[pregunta_cerrada_1] ?? ""}${detMsg[pregunta_cerrada_2] ?? ""}${painSnippet}${cta}`;
}

// ─── componente tarjeta ───────────────────────────────────────────────────
function ProspectCard({ p }: { p: Prospect }) {
  const [copied, setCopied] = useState<"tel" | "email" | "msg" | null>(null);
  const postura = calcPostura(p.pregunta_cerrada_1, p.pregunta_cerrada_2);
  const prioridad = getPrioridad(postura, p.cargo);
  const approachMsg = buildApproach(p);
  const ps = POSTURA_STYLE[postura.nivel];

  const copy = useCallback((text: string, key: "tel" | "email" | "msg") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const fecha = new Date(p.created_at).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <article
      style={{
        background: "#1e293b",
        border: `1px solid ${ps.ring}`,
        boxShadow: `0 0 0 1px ${ps.ring}22, 0 8px 24px #00000055`,
        borderRadius: "1.25rem",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── banda superior ── */}
      <div style={{ background: ps.badge, padding: "0.5rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: ps.text, textTransform: "uppercase" }}>
          {prioridad.label}
        </span>
        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>#{String(p.folio).padStart(4, "0")} · {fecha}</span>
      </div>

      <div style={{ padding: "1.25rem 1.4rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* ── empresa + nombre ── */}
        <div>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f1f5f9", lineHeight: 1.15, margin: 0 }}>
            {p.empresa}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1rem", color: "#cbd5e1", fontWeight: 600 }}>{p.nombre}</span>
            <span style={{
              fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.55rem",
              borderRadius: "99px", background: "#334155", color: "#94a3b8",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              {CARGO_LABEL[p.cargo] ?? p.cargo}
            </span>
          </div>
        </div>

        {/* ── contacto estilo contact center ── */}
        <div style={{ background: "#0f172a", borderRadius: "0.75rem", padding: "0.875rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* teléfono */}
          {p.telefono && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.05rem" }}>📞</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4ade80", letterSpacing: "0.04em", fontFamily: "monospace" }}>
                  {p.telefono}
                </span>
              </div>
              <button
                onClick={() => copy(p.telefono!, "tel")}
                style={{ fontSize: "0.65rem", padding: "0.2rem 0.6rem", borderRadius: "6px", background: "#1e293b", color: copied === "tel" ? "#4ade80" : "#64748b", border: "1px solid #334155", cursor: "pointer" }}
              >
                {copied === "tel" ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
          )}
          {/* correo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
              <span style={{ fontSize: "1rem" }}>✉️</span>
              <span style={{ fontSize: "0.82rem", color: "#7dd3fc", wordBreak: "break-all" }}>{p.correo}</span>
            </div>
            <button
              onClick={() => copy(p.correo, "email")}
              style={{ flexShrink: 0, fontSize: "0.65rem", padding: "0.2rem 0.6rem", borderRadius: "6px", background: "#1e293b", color: copied === "email" ? "#4ade80" : "#64748b", border: "1px solid #334155", cursor: "pointer" }}
            >
              {copied === "email" ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        {/* ── postura de seguridad ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ flex: 1, height: "6px", borderRadius: "99px", background: "#1e293b", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(postura.puntos / 20) * 100}%`, background: ps.ring, borderRadius: "99px", transition: "width 0.4s" }} />
          </div>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.6rem", borderRadius: "99px", background: ps.badge, color: ps.text, whiteSpace: "nowrap" }}>
            {postura.label}
          </span>
        </div>

        {/* ── respuestas ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Respuestas</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem" }}>
              <span style={{ color: "#64748b", flexShrink: 0 }}>Riesgo principal:</span>
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{RIESGO_LABEL[p.pregunta_cerrada_1] ?? p.pregunta_cerrada_1}</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem" }}>
              <span style={{ color: "#64748b", flexShrink: 0 }}>Detección interna:</span>
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{DETECCION_LABEL[p.pregunta_cerrada_2] ?? p.pregunta_cerrada_2}</span>
            </div>
          </div>
          {p.dolor_reto && (
            <blockquote style={{ margin: "0.3rem 0 0", borderLeft: "2px solid #334155", paddingLeft: "0.75rem", color: "#9daebe", fontSize: "0.78rem", lineHeight: 1.5, fontStyle: "italic" }}>
              "{p.dolor_reto}"
            </blockquote>
          )}
        </div>

        {/* ── mensaje de approach ── */}
        <div style={{ background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: "0.75rem", padding: "0.875rem 1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              💬 Mensaje de approach
            </p>
            <button
              onClick={() => copy(approachMsg, "msg")}
              style={{ fontSize: "0.65rem", padding: "0.2rem 0.7rem", borderRadius: "6px", background: copied === "msg" ? "#1e3a5f" : "#1e293b", color: copied === "msg" ? "#4ade80" : "#38bdf8", border: "1px solid #1e3a5f", cursor: "pointer", fontWeight: 600 }}
            >
              {copied === "msg" ? "✓ Copiado" : "Copiar mensaje"}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.65 }}>
            {approachMsg}
          </p>
        </div>

      </div>
    </article>
  );
}

// ─── filtros ──────────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "critica", label: "Crítica" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "basica", label: "Razonable" },
];

// ─── página principal ─────────────────────────────────────────────────────
export default function ProspectosPage() {
  const [adminKey, setAdminKey] = useState("");
  const [prospects, setProspects] = useState<Prospect[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterNivel, setFilterNivel] = useState("all");

  async function fetchProspects() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prospects", {
        headers: { "x-admin-key": adminKey.trim() },
      });
      const data = await res.json() as { ok?: boolean; prospects?: Prospect[]; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No autorizado o error de servidor.");
        return;
      }
      setProspects(data.prospects ?? []);
    } catch {
      setError("Fallo de conexión.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = (prospects ?? []).filter((p) => {
    const matchSearch =
      search.trim() === "" ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.empresa.toLowerCase().includes(search.toLowerCase()) ||
      p.correo.toLowerCase().includes(search.toLowerCase());
    const matchNivel =
      filterNivel === "all" || calcPostura(p.pregunta_cerrada_1, p.pregunta_cerrada_2).nivel === filterNivel;
    return matchSearch && matchNivel;
  });

  return (
    <main style={{ minHeight: "100vh", background: "#0f172a", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* ── encabezado ── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.3rem" }}>🎯</span>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", fontFamily: "Space Grotesk, sans-serif" }}>
              Perfiles de prospectos
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
            Tarjetas de contacto para seguimiento comercial · iSEC / ThreatDown
          </p>
        </div>

        {/* ── gate de acceso ── */}
        {!prospects ? (
          <div style={{ maxWidth: "480px" }}>
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", padding: "2rem" }}>
              <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#94a3b8" }}>
                Ingresa tu clave de administrador para cargar los perfiles
              </p>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchProspects()}
                placeholder="Clave de administrador"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.75rem 1rem", borderRadius: "0.6rem",
                  border: "1px solid #334155", background: "#0f172a",
                  color: "#f1f5f9", fontSize: "0.9rem", marginBottom: "0.75rem",
                }}
              />
              {error && <p style={{ color: "#f87171", fontSize: "0.8rem", margin: "0 0 0.75rem" }}>{error}</p>}
              <button
                onClick={fetchProspects}
                disabled={loading || adminKey.trim().length === 0}
                style={{
                  width: "100%", padding: "0.75rem", borderRadius: "0.6rem",
                  background: loading ? "#334155" : "#0ea5e9",
                  color: "#fff", fontSize: "0.9rem", fontWeight: 700,
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Cargando…" : "Ver perfiles"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── barra de controles ── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1.5rem" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, empresa o correo…"
                style={{
                  flex: 1, minWidth: "220px", padding: "0.55rem 0.9rem",
                  borderRadius: "0.6rem", border: "1px solid #334155",
                  background: "#1e293b", color: "#f1f5f9", fontSize: "0.85rem",
                }}
              />
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterNivel(opt.value)}
                    style={{
                      padding: "0.4rem 0.85rem", borderRadius: "99px", fontSize: "0.75rem",
                      fontWeight: 600, border: "1px solid",
                      borderColor: filterNivel === opt.value ? "#0ea5e9" : "#334155",
                      background: filterNivel === opt.value ? "#0c4a6e" : "#1e293b",
                      color: filterNivel === opt.value ? "#7dd3fc" : "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: "0.78rem", color: "#475569", whiteSpace: "nowrap" }}>
                {filtered.length} de {prospects.length} prospectos
              </span>
              <button
                onClick={() => { setProspects(null); setSearch(""); setFilterNivel("all"); }}
                style={{ padding: "0.4rem 0.85rem", borderRadius: "0.5rem", background: "#1e293b", color: "#64748b", border: "1px solid #334155", cursor: "pointer", fontSize: "0.75rem" }}
              >
                Cerrar sesión
              </button>
            </div>

            {/* ── grid de tarjetas ── */}
            {filtered.length === 0 ? (
              <p style={{ color: "#475569", fontSize: "0.9rem" }}>No hay prospectos que coincidan con los filtros.</p>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                gap: "1.25rem",
              }}>
                {filtered.map((p) => (
                  <ProspectCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}
