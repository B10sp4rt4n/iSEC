"use client";

import { useState, useCallback, useEffect, useRef } from "react";

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

// ─── tipo de nota ────────────────────────────────────────────────────────
type Note = {
  id: string;
  autor: string;
  contenido: string;
  created_at: string;
};

// ─── tipo de alerta ──────────────────────────────────────────────────────
type Alert = {
  id: string;
  prospect_id: string;
  scheduled_at: string;
  titulo: string;
  nota: string;
  completado: boolean;
  created_by: string;
  created_at: string;
};

type AlertWithProspect = Alert & {
  prospect_nombre: string;
  prospect_empresa: string;
  prospect_telefono: string | null;
  prospect_correo: string;
};

// ─── panel de notas ──────────────────────────────────────────────────────
function NotesPanel({ prospectId, adminKey, agenteName }: { prospectId: string; adminKey: string; agenteName: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genAI, setGenAI] = useState(false);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/prospects/${prospectId}/notes`, {
      headers: { "x-admin-key": adminKey },
    })
      .then((r) => r.json())
      .then((d: { notes?: Note[] }) => setNotes(d.notes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, prospectId, adminKey]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes, open]);

  async function saveNote() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ contenido: text.trim(), autor: agenteName }),
      });
      const d = (await res.json()) as { note?: Note };
      if (d.note) setNotes((prev) => [...prev, d.note!]);
      setText("");
    } finally {
      setSaving(false);
    }
  }

  async function generateAI() {
    setGenAI(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ generar_ia: true }),
      });
      const d = (await res.json()) as { note?: Note };
      if (d.note) setNotes((prev) => [...prev, d.note!]);
    } finally {
      setGenAI(false);
    }
  }

  const noteCount = notes.length;

  return (
    <div style={{ borderTop: "1px solid #1e3a5f", marginTop: "0.25rem" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "0.75rem 0", display: "flex", alignItems: "center", justifyContent: "space-between",
          color: "#64748b", fontSize: "0.78rem", fontWeight: 600,
        }}
      >
        <span>📋 Notas y seguimiento{noteCount > 0 ? ` (${noteCount})` : ""}</span>
        <span style={{ fontSize: "0.7rem" }}>{open ? "▲ Cerrar" : "▼ Ver"}</span>
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", paddingBottom: "0.5rem" }}>
          {/* lista de notas */}
          {loading ? (
            <p style={{ fontSize: "0.75rem", color: "#475569", margin: 0 }}>Cargando notas…</p>
          ) : notes.length === 0 ? (
            <p style={{ fontSize: "0.75rem", color: "#475569", margin: 0, fontStyle: "italic" }}>Sin notas aún. Agrega la primera.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "280px", overflowY: "auto" }}>
              {notes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    borderLeft: `3px solid ${n.autor === "ia" ? "#818cf8" : "#38bdf8"}`,
                    paddingLeft: "0.75rem",
                    background: "#0f172a",
                    borderRadius: "0 0.5rem 0.5rem 0",
                    padding: "0.6rem 0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.5rem",
                      borderRadius: "99px",
                      background: n.autor === "ia" ? "#312e81" : "#0c4a6e",
                      color: n.autor === "ia" ? "#a5b4fc" : "#7dd3fc",
                    }}>
                      {n.autor === "ia" ? "✦ IA" : `👤 ${n.autor}`}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "#475569" }}>
                      {new Date(n.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{n.contenido}</p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {/* input para nueva nota */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe una nota de seguimiento…"
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box", resize: "none",
              padding: "0.6rem 0.75rem", borderRadius: "0.5rem",
              border: "1px solid #334155", background: "#0f172a",
              color: "#f1f5f9", fontSize: "0.8rem", lineHeight: 1.5,
            }}
          />

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={saveNote}
              disabled={saving || !text.trim()}
              style={{
                flex: 1, padding: "0.45rem 0.8rem", borderRadius: "0.5rem",
                background: saving ? "#334155" : "#0ea5e9",
                color: "#fff", fontSize: "0.75rem", fontWeight: 600,
                border: "none", cursor: saving || !text.trim() ? "not-allowed" : "pointer",
                opacity: !text.trim() ? 0.5 : 1,
              }}
            >
              {saving ? "Guardando…" : "💾 Guardar nota"}
            </button>
            <button
              onClick={generateAI}
              disabled={genAI}
              style={{
                flex: 1, padding: "0.45rem 0.8rem", borderRadius: "0.5rem",
                background: genAI ? "#312e81" : "#4338ca",
                color: "#c7d2fe", fontSize: "0.75rem", fontWeight: 600,
                border: "none", cursor: genAI ? "not-allowed" : "pointer",
              }}
            >
              {genAI ? "Generando…" : "✦ Sugerir con IA"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── helpers de calendario ──────────────────────────────────────────────
function googleCalendarUrl(titulo: string, nota: string, start: Date, empresa: string, nombre: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const details = `Empresa: ${empresa}\nContacto: ${nombre}${nota ? `\n\nNotas: ${nota}` : ""}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${titulo} — ${empresa}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsContent(titulo: string, nota: string, start: Date, empresa: string, nombre: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const uid = `${start.getTime()}@isec-prospectos`;
  const description = `Empresa: ${empresa}\\nContacto: ${nombre}${nota ? `\\nNotas: ${nota}` : ""}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//iSEC Prospectos//ES",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${titulo} — ${empresa}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadIcs(titulo: string, nota: string, start: Date, empresa: string, nombre: string) {
  const content = icsContent(titulo, nota, start, empresa, nombre);
  const blob = new Blob([content], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `recordatorio-${empresa.replace(/\s+/g, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── panel de alertas / calendario ──────────────────────────────────────
function AlertPanel({
  prospectId, adminKey, agenteName, prospectNombre, prospectEmpresa, onAlertChanged,
}: {
  prospectId: string; adminKey: string; agenteName: string;
  prospectNombre: string; prospectEmpresa: string; onAlertChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [titulo, setTitulo] = useState("Llamada de seguimiento");
  const [nota, setNota] = useState("");
  const [lastSaved, setLastSaved] = useState<Alert | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/prospects/${prospectId}/alerts`, {
      headers: { "x-admin-key": adminKey },
    })
      .then((r) => r.json())
      .then((d: { alerts?: Alert[] }) => setAlerts(d.alerts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, prospectId, adminKey]);

  async function saveAlert() {
    if (!date || !time) return;
    setSaving(true);
    try {
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const res = await fetch(`/api/prospects/${prospectId}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ scheduled_at, titulo, nota, created_by: agenteName }),
      });
      const d = (await res.json()) as { alert?: Alert };
      if (d.alert) {
        setAlerts((prev) => [...prev, d.alert!].sort(
          (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ));
        setLastSaved(d.alert!);
        setDate("");
        setTime("");
        setNota("");
        setTitulo("Llamada de seguimiento");
        onAlertChanged?.();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(alertId: string, completado: boolean) {
    const res = await fetch(`/api/prospects/${prospectId}/alerts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ alertId, completado: !completado }),
    });
    const d = (await res.json()) as { alert?: Alert };
    if (d.alert) {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? d.alert! : a)));
      onAlertChanged?.();
    }
  }

  const now = new Date();
  const pendingCount = alerts.filter((a) => !a.completado).length;
  const overdueCount = alerts.filter((a) => !a.completado && new Date(a.scheduled_at) < now).length;

  function alertIcon(a: Alert) {
    if (a.completado) return "✅";
    if (new Date(a.scheduled_at) < now) return "⚠️";
    return "📅";
  }

  function alertColor(a: Alert): string {
    if (a.completado) return "#334155";
    if (new Date(a.scheduled_at) < now) return "#7f1d1d";
    const diff = new Date(a.scheduled_at).getTime() - now.getTime();
    if (diff < 24 * 60 * 60 * 1000) return "#422006";
    return "#0c4a6e";
  }

  function alertTextColor(a: Alert): string {
    if (a.completado) return "#64748b";
    if (new Date(a.scheduled_at) < now) return "#fca5a5";
    const diff = new Date(a.scheduled_at).getTime() - now.getTime();
    if (diff < 24 * 60 * 60 * 1000) return "#fdba74";
    return "#7dd3fc";
  }

  // Fecha mínima: hoy
  const minDate = now.toISOString().slice(0, 10);

  return (
    <div style={{ borderTop: "1px solid #1e3a5f", marginTop: "0.25rem" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "0.75rem 0", display: "flex", alignItems: "center", justifyContent: "space-between",
          color: overdueCount > 0 ? "#fca5a5" : "#64748b", fontSize: "0.78rem", fontWeight: 600,
        }}
      >
        <span>
          📅 Recordatorios
          {pendingCount > 0 && (
            <span style={{
              marginLeft: "0.4rem", fontSize: "0.65rem", padding: "0.1rem 0.45rem",
              borderRadius: "99px",
              background: overdueCount > 0 ? "#7f1d1d" : "#0c4a6e",
              color: overdueCount > 0 ? "#fca5a5" : "#7dd3fc",
            }}>
              {overdueCount > 0 ? `⚠️ ${overdueCount} vencido${overdueCount > 1 ? "s" : ""}` : `${pendingCount} pendiente${pendingCount > 1 ? "s" : ""}`}
            </span>
          )}
        </span>
        <span style={{ fontSize: "0.7rem" }}>{open ? "▲ Cerrar" : "▼ Ver"}</span>
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "0.75rem" }}>

          {/* lista de alertas */}
          {loading ? (
            <p style={{ fontSize: "0.75rem", color: "#475569", margin: 0 }}>Cargando recordatorios…</p>
          ) : alerts.length === 0 ? (
            <p style={{ fontSize: "0.75rem", color: "#475569", margin: 0, fontStyle: "italic" }}>Sin recordatorios. Programa el primer contacto.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {alerts.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "0.75rem",
                    background: alertColor(a),
                    borderRadius: "0.5rem", padding: "0.6rem 0.75rem",
                    opacity: a.completado ? 0.6 : 1,
                  }}
                >
                  <span style={{ fontSize: "1rem", flexShrink: 0 }}>{alertIcon(a)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: alertTextColor(a), textDecoration: a.completado ? "line-through" : "none" }}>
                        {a.titulo}
                      </span>
                      <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>
                        {new Date(a.scheduled_at).toLocaleDateString("es-MX", {
                          weekday: "short", day: "2-digit", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {a.nota && (
                      <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>{a.nota}</p>
                    )}
                    <p style={{ margin: "0.15rem 0 0", fontSize: "0.62rem", color: "#475569" }}>por {a.created_by}</p>
                  </div>
                  <button
                    onClick={() => toggleComplete(a.id, a.completado)}
                    title={a.completado ? "Marcar pendiente" : "Marcar completado"}
                    style={{
                      flexShrink: 0, fontSize: "0.65rem", padding: "0.2rem 0.5rem",
                      borderRadius: "6px", border: "1px solid #334155",
                      background: "#1e293b", color: a.completado ? "#64748b" : "#4ade80",
                      cursor: "pointer",
                    }}
                  >
                    {a.completado ? "↩ Reabrir" : "✓ Listo"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* formulario nuevo recordatorio */}
          <div style={{ background: "#0f172a", borderRadius: "0.75rem", padding: "0.875rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              ＋ Nuevo recordatorio
            </p>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Motivo (ej. Llamada de seguimiento)"
              maxLength={200}
              style={{
                width: "100%", boxSizing: "border-box", padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem", border: "1px solid #334155",
                background: "#1e293b", color: "#f1f5f9", fontSize: "0.8rem",
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div>
                <label style={{ fontSize: "0.65rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}>Fecha</label>
                <input
                  type="date"
                  value={date}
                  min={minDate}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "0.5rem 0.6rem",
                    borderRadius: "0.5rem", border: "1px solid #334155",
                    background: "#1e293b", color: "#f1f5f9", fontSize: "0.8rem",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.65rem", color: "#64748b", display: "block", marginBottom: "0.25rem" }}>Hora</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "0.5rem 0.6rem",
                    borderRadius: "0.5rem", border: "1px solid #334155",
                    background: "#1e293b", color: "#f1f5f9", fontSize: "0.8rem",
                  }}
                />
              </div>
            </div>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota opcional: qué hablar, objetivo de la llamada…"
              rows={2}
              maxLength={1000}
              style={{
                width: "100%", boxSizing: "border-box", resize: "none",
                padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
                border: "1px solid #334155", background: "#1e293b",
                color: "#f1f5f9", fontSize: "0.78rem", lineHeight: 1.5,
              }}
            />
            <button
              onClick={saveAlert}
              disabled={saving || !date || !time || !titulo.trim()}
              style={{
                padding: "0.5rem 1rem", borderRadius: "0.5rem",
                background: saving || !date || !time ? "#334155" : "#0ea5e9",
                color: "#fff", fontSize: "0.78rem", fontWeight: 700,
                border: "none", cursor: saving || !date || !time ? "not-allowed" : "pointer",
                opacity: !date || !time ? 0.5 : 1,
              }}
            >
              {saving ? "Guardando…" : "📅 Programar recordatorio"}
            </button>

            {/* botones de calendario tras guardar */}
            {lastSaved && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", paddingTop: "0.25rem" }}>
                <p style={{ margin: 0, width: "100%", fontSize: "0.68rem", color: "#4ade80", fontWeight: 600 }}>
                  ✓ Recordatorio guardado — agrégalo a tu calendario:
                </p>
                <a
                  href={googleCalendarUrl(lastSaved.titulo, lastSaved.nota, new Date(lastSaved.scheduled_at), prospectEmpresa, prospectNombre)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                    padding: "0.45rem 0.75rem", borderRadius: "0.5rem",
                    background: "#1e3a5f", color: "#7dd3fc", fontSize: "0.75rem", fontWeight: 700,
                    border: "1px solid #1e3a5f", textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  📆 Google Calendar
                </a>
                <button
                  onClick={() => downloadIcs(lastSaved!.titulo, lastSaved!.nota, new Date(lastSaved!.scheduled_at), prospectEmpresa, prospectNombre)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                    padding: "0.45rem 0.75rem", borderRadius: "0.5rem",
                    background: "#312e81", color: "#a5b4fc", fontSize: "0.75rem", fontWeight: 700,
                    border: "1px solid #312e81", cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  ⬇ Outlook / Apple Cal (.ics)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── barra global de alertas ─────────────────────────────────────────────
function AlertsBar({
  adminKey, version, onNavigate,
}: {
  adminKey: string; version: number; onNavigate: (prospectId: string) => void;
}) {
  const [alerts, setAlerts] = useState<AlertWithProspect[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetch("/api/alerts", { headers: { "x-admin-key": adminKey } })
      .then((r) => r.json())
      .then((d: { alerts?: AlertWithProspect[] }) => setAlerts(d.alerts ?? []))
      .catch(() => {});
  }, [adminKey, version]);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday   = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek    = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const overdue  = alerts.filter((a) => new Date(a.scheduled_at) < startOfToday);
  const today    = alerts.filter((a) => new Date(a.scheduled_at) >= startOfToday && new Date(a.scheduled_at) < endOfToday);
  const upcoming = alerts.filter((a) => new Date(a.scheduled_at) >= endOfToday && new Date(a.scheduled_at) < endOfWeek);
  const later    = alerts.filter((a) => new Date(a.scheduled_at) >= endOfWeek);

  if (alerts.length === 0) return null;

  function AlertItem({ a, accent }: { a: AlertWithProspect; accent: string }) {
    return (
      <button
        onClick={() => onNavigate(a.prospect_id)}
        style={{
          width: "100%", textAlign: "left", background: "none", border: "none",
          cursor: "pointer", padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#1e293b")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
      >
        <span style={{ flexShrink: 0, fontSize: "0.75rem", fontFamily: "monospace", color: accent, fontWeight: 700, minWidth: "5.5rem" }}>
          {new Date(a.scheduled_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
          {" "}
          {new Date(a.scheduled_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#e2e8f0", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.prospect_empresa} — {a.prospect_nombre}
          </span>
          <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{a.titulo}</span>
        </div>
        {a.prospect_telefono && (
          <span style={{ flexShrink: 0, fontSize: "0.7rem", color: "#4ade80", fontFamily: "monospace" }}>
            📞 {a.prospect_telefono}
          </span>
        )}
        <span style={{ flexShrink: 0, fontSize: "0.65rem", color: "#475569" }}>▶</span>
      </button>
    );
  }

  function Section({ title, items, accent, bg }: { title: string; items: AlertWithProspect[]; accent: string; bg: string }) {
    if (items.length === 0) return null;
    return (
      <div>
        <p style={{ margin: "0 0 0.3rem", fontSize: "0.65rem", fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.1em", paddingLeft: "0.75rem" }}>
          {title} ({items.length})
        </p>
        <div style={{ background: bg, borderRadius: "0.5rem", overflow: "hidden" }}>
          {items.map((a) => <AlertItem key={a.id} a={a} accent={accent} />)}
        </div>
      </div>
    );
  }

  const totalLabel = overdue.length > 0
    ? `⚠️ ${overdue.length} vencida${overdue.length > 1 ? "s" : ""} · ${alerts.length} total`
    : `${alerts.length} recordatorio${alerts.length > 1 ? "s" : ""} pendiente${alerts.length > 1 ? "s" : ""}`;

  return (
    <div style={{
      background: "#1e293b", border: `1px solid ${overdue.length > 0 ? "#b91c1c" : "#334155"}`,
      borderRadius: "0.875rem", marginBottom: "1.25rem", overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", background: overdue.length > 0 ? "#450a0a" : "#0f172a",
          border: "none", cursor: "pointer", padding: "0.75rem 1.25rem",
          display: "flex", alignItems: "center", gap: "0.75rem", textAlign: "left",
        }}
      >
        <span style={{ fontSize: "1rem" }}>🔔</span>
        <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 700, color: overdue.length > 0 ? "#fca5a5" : "#e2e8f0" }}>
          {totalLabel}
        </span>
        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{open ? "▲ Cerrar" : "▼ Ver agenda"}</span>
      </button>

      {open && (
        <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Section title="Vencidas" items={overdue}  accent="#f87171" bg="#450a0a22" />
          <Section title="Hoy"     items={today}    accent="#fbbf24" bg="#42200622" />
          <Section title="Esta semana" items={upcoming} accent="#38bdf8" bg="#0c4a6e22" />
          <Section title="Más adelante" items={later}  accent="#818cf8" bg="#1e1b4b22" />
        </div>
      )}
    </div>
  );
}
function ProspectRow({
  p, adminKey, agenteName, expanded, onToggle, onAlertChanged,
}: {
  p: Prospect; adminKey: string; agenteName: string; expanded: boolean; onToggle: () => void; onAlertChanged?: () => void;
}) {
  const [copied, setCopied] = useState<"tel" | "email" | "msg" | null>(null);
  const postura = calcPostura(p.pregunta_cerrada_1, p.pregunta_cerrada_2);
  const prioridad = getPrioridad(postura, p.cargo);
  const approachMsg = buildApproach(p);
  const ps = POSTURA_STYLE[postura.nivel];
  const rowRef = useRef<HTMLDivElement>(null);

  const copy = useCallback((text: string, key: "tel" | "email" | "msg") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const fecha = new Date(p.created_at).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  useEffect(() => {
    if (expanded) rowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [expanded]);

  return (
    <div
      ref={rowRef}
      style={{
        width: "100%",
        background: "#1e293b",
        border: `1px solid ${expanded ? ps.ring : "#334155"}`,
        borderRadius: "0.875rem",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* ── Encabezado clickable ── */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: expanded ? ps.badge : "transparent",
          border: "none", cursor: "pointer", padding: "0.875rem 1.25rem",
          display: "flex", alignItems: "center", gap: "0.75rem",
          textAlign: "left", transition: "background 0.2s",
        }}
      >
        {/* folio */}
        <span style={{ fontSize: "0.68rem", color: "#475569", fontFamily: "monospace", flexShrink: 0 }}>
          #{String(p.folio).padStart(4, "0")}
        </span>

        {/* prioridad badge */}
        <span style={{
          fontSize: "0.62rem", fontWeight: 700, padding: "0.15rem 0.6rem",
          borderRadius: "99px", background: ps.badge, color: ps.text,
          border: `1px solid ${ps.ring}55`, flexShrink: 0, whiteSpace: "nowrap",
        }}>
          {prioridad.label}
        </span>

        {/* empresa + nombre + cargo */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0, overflow: "hidden" }}>
          <span style={{
            fontSize: "1rem", fontWeight: 800, color: "#f1f5f9",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {p.empresa}
          </span>
          <span style={{ fontSize: "0.82rem", color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
            {p.nombre}
          </span>
          <span style={{
            display: "none", fontSize: "0.62rem", fontWeight: 600, padding: "0.1rem 0.45rem",
            borderRadius: "99px", background: "#334155", color: "#64748b",
            flexShrink: 0,
          }}
            className="cargo-badge"
          >
            {CARGO_LABEL[p.cargo] ?? p.cargo}
          </span>
        </div>

        {/* postura */}
        <span style={{
          fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.6rem",
          borderRadius: "99px", background: ps.badge, color: ps.text,
          flexShrink: 0, whiteSpace: "nowrap",
        }}>
          {postura.label}
        </span>

        {/* fecha */}
        <span style={{ fontSize: "0.62rem", color: "#475569", flexShrink: 0, whiteSpace: "nowrap" }}>
          {fecha}
        </span>

        {/* flecha */}
        <span style={{
          fontSize: "1rem", color: ps.text, flexShrink: 0,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.25s",
          display: "inline-block",
        }}>
          ▾
        </span>
      </button>

      {/* ── Cuerpo expandible ── */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${ps.ring}44`, padding: "1.5rem 1.5rem 1.25rem" }}>

          {/* ── fila superior: empresa + link + cargo ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", lineHeight: 1.15, margin: 0 }}>
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
            <a
              href={`https://www.${p.correo.split("@")[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Visitar ${p.correo.split("@")[1]}`}
              style={{
                flexShrink: 0, fontSize: "0.65rem", padding: "0.25rem 0.7rem",
                borderRadius: "99px", background: "#0c4a6e", color: "#7dd3fc",
                border: "1px solid #1e3a5f", textDecoration: "none", fontWeight: 600,
                display: "flex", alignItems: "center", gap: "0.25rem",
                whiteSpace: "nowrap",
              }}
            >
              🌐 {p.correo.split("@")[1]}
            </a>
          </div>

          {/* ── dos columnas: contacto | respuestas ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>

            {/* contacto */}
            <div style={{ background: "#0f172a", borderRadius: "0.75rem", padding: "0.875rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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

            {/* respuestas + postura */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ flex: 1, height: "6px", borderRadius: "99px", background: "#334155", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(postura.puntos / 20) * 100}%`, background: ps.ring, borderRadius: "99px" }} />
                </div>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.6rem", borderRadius: "99px", background: ps.badge, color: ps.text, whiteSpace: "nowrap" }}>
                  {postura.label}
                </span>
              </div>
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
                <blockquote style={{ margin: 0, borderLeft: "2px solid #334155", paddingLeft: "0.75rem", color: "#9daebe", fontSize: "0.78rem", lineHeight: 1.5, fontStyle: "italic" }}>
                  "{p.dolor_reto}"
                </blockquote>
              )}
            </div>
          </div>

          {/* ── mensaje de approach ── */}
          <div style={{ background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: "0.75rem", padding: "0.875rem 1rem", marginBottom: "1.25rem" }}>
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

          {/* ── panel de notas ── */}
          <NotesPanel prospectId={p.id} adminKey={adminKey} agenteName={agenteName} />

          {/* ── panel de alertas / calendario ── */}
          <AlertPanel prospectId={p.id} adminKey={adminKey} agenteName={agenteName} prospectNombre={p.nombre} prospectEmpresa={p.empresa} onAlertChanged={onAlertChanged} />

        </div>
      )}
    </div>
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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [agenteName, setAgenteName] = useState("");
  const [prospects, setProspects] = useState<Prospect[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterNivel, setFilterNivel] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [alertsVersion, setAlertsVersion] = useState(0);

  const refreshAlerts = useCallback(() => setAlertsVersion((v) => v + 1), []);

  function switchMode(m: "login" | "register") {
    setMode(m);
    setError(null);
    setAlias("");
    setPassword("");
    setNombre("");
    setApellido("");
    setConfirmPassword("");
  }

  async function doLogin(aliasVal: string, passVal: string) {
    const loginRes = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias: aliasVal.trim(), password: passVal }),
    });
    const loginData = await loginRes.json() as { ok?: boolean; nombre?: string; adminToken?: string; error?: string };
    if (!loginRes.ok || !loginData.ok) {
      setError(loginData.error ?? "Alias o contraseña incorrectos.");
      return;
    }
    const token = loginData.adminToken!;
    setAdminKey(token);
    setAgenteName(loginData.nombre ?? aliasVal.trim());

    const prosRes = await fetch("/api/prospects", {
      headers: { "x-admin-key": token },
    });
    const prosData = await prosRes.json() as { ok?: boolean; prospects?: Prospect[]; error?: string };
    if (!prosRes.ok || !prosData.ok) {
      setError(prosData.error ?? "Error al cargar prospectos.");
      return;
    }
    setProspects(prosData.prospects ?? []);
  }

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      await doLogin(alias, password);
    } catch {
      setError("Fallo de conexión.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const regRes = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: alias.trim(), nombre: nombre.trim(), apellido: apellido.trim(), password }),
      });
      const regData = await regRes.json() as { user?: unknown; error?: string };
      if (!regRes.ok) {
        setError(regData.error ?? "Error al crear usuario.");
        return;
      }
      // Registro exitoso → login automático
      await doLogin(alias, password);
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
          <div style={{ maxWidth: "400px" }}>
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", padding: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>

              {/* tabs login / registro */}
              <div style={{ display: "flex", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid #334155" }}>
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    style={{
                      flex: 1, padding: "0.5rem", fontSize: "0.8rem", fontWeight: 700,
                      border: "none", cursor: "pointer",
                      background: mode === m ? "#0ea5e9" : "#0f172a",
                      color: mode === m ? "#fff" : "#64748b",
                    }}
                  >
                    {m === "login" ? "Iniciar sesión" : "Registrarse"}
                  </button>
                ))}
              </div>

              <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                {mode === "login" ? "Ingresa con tu alias y contraseña." : "Crea tu acceso la primera vez."}
              </p>

              {/* campos extra sólo en registro */}
              {mode === "register" && (
                <>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre"
                    style={{ width: "100%", boxSizing: "border-box", padding: "0.7rem 1rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.9rem" }}
                  />
                  <input
                    type="text"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="Apellido"
                    style={{ width: "100%", boxSizing: "border-box", padding: "0.7rem 1rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.9rem" }}
                  />
                </>
              )}

              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLogin()}
                placeholder="Alias (ej. salvador)"
                autoCapitalize="none"
                style={{ width: "100%", boxSizing: "border-box", padding: "0.7rem 1rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.9rem" }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLogin()}
                placeholder="Contraseña (mín. 8 caracteres)"
                style={{ width: "100%", boxSizing: "border-box", padding: "0.7rem 1rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.9rem" }}
              />

              {/* confirmar contraseña solo en registro */}
              {mode === "register" && (
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar contraseña"
                  style={{ width: "100%", boxSizing: "border-box", padding: "0.7rem 1rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.9rem" }}
                />
              )}

              {error && <p style={{ color: "#f87171", fontSize: "0.8rem", margin: 0 }}>{error}</p>}

              <button
                onClick={mode === "login" ? handleLogin : handleRegister}
                disabled={
                  loading ||
                  alias.trim().length === 0 ||
                  password.length === 0 ||
                  (mode === "register" && (nombre.trim().length === 0 || apellido.trim().length === 0 || confirmPassword.length === 0))
                }
                style={{
                  width: "100%", padding: "0.75rem", borderRadius: "0.6rem",
                  background: loading ? "#334155" : "#0ea5e9",
                  color: "#fff", fontSize: "0.9rem", fontWeight: 700,
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading
                  ? mode === "login" ? "Ingresando…" : "Registrando…"
                  : mode === "login" ? "Entrar" : "Crear cuenta y entrar"}
              </button>

            </div>
          </div>
        ) : (
          <>
            {/* ── barra de controles ── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedAccount(""); setExpandedId(null); }}
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
                    onClick={() => { setFilterNivel(opt.value); setSelectedAccount(""); setExpandedId(null); }}
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
              <a
                href="/admin/usuarios"
                style={{ padding: "0.4rem 0.85rem", borderRadius: "0.5rem", background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", fontSize: "0.75rem", textDecoration: "none", whiteSpace: "nowrap" }}
              >
                👥 Usuarios
              </a>
              <button
                onClick={() => { setProspects(null); setSearch(""); setFilterNivel("all"); setSelectedAccount(""); setExpandedId(null); setAlias(""); setPassword(""); setAdminKey(""); setAgenteName(""); setMode("login"); setNombre(""); setApellido(""); setConfirmPassword(""); setError(null); }}
                style={{ padding: "0.4rem 0.85rem", borderRadius: "0.5rem", background: "#1e293b", color: "#64748b", border: "1px solid #334155", cursor: "pointer", fontSize: "0.75rem" }}
              >
                Cerrar sesión
              </button>
            </div>

            {/* ── barra global de alertas ── */}
            <AlertsBar
              adminKey={adminKey}
              version={alertsVersion}
              onNavigate={(prospectId) => {
                setSelectedAccount(prospectId);
                setExpandedId(prospectId);
              }}
            />

            {/* ── selector de cuenta ── */}
            {filtered.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <select
                  value={selectedAccount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedAccount(val);
                    setExpandedId(val || null);
                  }}
                  style={{
                    width: "100%", padding: "0.65rem 1rem",
                    borderRadius: "0.75rem", border: "1px solid #334155",
                    background: "#1e293b", color: "#f1f5f9",
                    fontSize: "0.9rem", cursor: "pointer",
                    appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center",
                    paddingRight: "2.5rem",
                  }}
                >
                  <option value="">— Ver todas las cuentas ({filtered.length}) —</option>
                  {filtered.map((p) => {
                    const pos = calcPostura(p.pregunta_cerrada_1, p.pregunta_cerrada_2);
                    const nivelEmoji = { critica: "🔴", alta: "🟠", media: "🟡", basica: "🟢" }[pos.nivel];
                    return (
                      <option key={p.id} value={p.id}>
                        {nivelEmoji} #{String(p.folio).padStart(4, "0")} · {p.empresa} — {p.nombre}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* ── lista accordion ── */}
            {filtered.length === 0 ? (
              <p style={{ color: "#475569", fontSize: "0.9rem" }}>No hay prospectos que coincidan con los filtros.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {(selectedAccount
                  ? filtered.filter((p) => p.id === selectedAccount)
                  : filtered
                ).map((p) => (
                  <ProspectRow
                    key={p.id}
                    p={p}
                    adminKey={adminKey}
                    agenteName={agenteName}
                    expanded={expandedId === p.id}
                    onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    onAlertChanged={refreshAlerts}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}
