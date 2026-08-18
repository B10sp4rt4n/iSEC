"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Recipient = {
  id: string;
  nombre: string;
  empresa: string;
  cargo: string;
  correo: string;
  created_at: string;
};

type RecipientsData = {
  total_db: number;
  to_send: number;
  excluded_count: number;
  recipients: Recipient[];
  excluded: Recipient[];
};

type SendResult = {
  ok: boolean;
  mode: string;
  sent?: number;
  failed?: number;
  total?: number;
  sent_to?: string;
  id?: string;
  error?: string;
};

type Tab = "recipients" | "preview" | "send";

const CAMPAIGNS = [
  { key: "aidr", label: "ThreatDown AIDR 2026", tag: "Shadow AI", color: "#63D89A" },
];

// ─── Auth gate ────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit() {
    if (!input.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/mailing/recipients", {
        headers: { "x-admin-key": input.trim() },
      });
      if (res.status === 401) {
        setError("Clave incorrecta.");
        return;
      }
      if (!res.ok) {
        setError("Error de servidor.");
        return;
      }
      onAuth(input.trim());
    } catch {
      setError("Fallo de conexión.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A1228", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: "360px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <span style={{ display: "inline-block", background: "#63D89A", color: "#061A10", fontSize: "12px", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", padding: "5px 16px", borderRadius: "20px", marginBottom: "1rem" }}>
            Mailing Studio
          </span>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#F5F7FA" }}>Panel de Campañas</h1>
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "#7A90B0" }}>SynAppsSys × ThreatDown</p>
        </div>
        <div style={{ background: "#0D1B3E", border: "1px solid #1B2D50", borderRadius: "1rem", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Clave de administrador"
            style={{ width: "100%", boxSizing: "border-box", padding: "0.75rem 1rem", borderRadius: "0.6rem", border: "1px solid #1B2D50", background: "#102044", color: "#F5F7FA", fontSize: "0.9rem", outline: "none" }}
            autoFocus
          />
          {error && <p style={{ color: "#f87171", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={checking || !input.trim()}
            style={{ width: "100%", padding: "0.75rem", borderRadius: "0.6rem", background: checking ? "#1E3A2A" : "#27AE60", color: "#fff", fontSize: "0.9rem", fontWeight: 700, border: "none", cursor: "pointer", opacity: !input.trim() ? 0.5 : 1 }}
          >
            {checking ? "Verificando…" : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Recipients table ─────────────────────────────────────────────────────────
function RecipientsTab({ data, loading }: { data: RecipientsData | null; loading: boolean }) {
  const [showExcluded, setShowExcluded] = useState(false);
  const [search, setSearch] = useState("");

  if (loading) return <p style={{ color: "#7A90B0", fontSize: "0.85rem" }}>Cargando destinatarios…</p>;
  if (!data) return null;

  const list = showExcluded ? data.excluded : data.recipients;
  const filtered = search
    ? list.filter((r) =>
        r.nombre.toLowerCase().includes(search.toLowerCase()) ||
        r.empresa.toLowerCase().includes(search.toLowerCase()) ||
        r.correo.toLowerCase().includes(search.toLowerCase()),
      )
    : list;

  function exportCsv() {
    const rows = [
      ["Nombre", "Empresa", "Cargo", "Correo", "Fecha"],
      ...data!.recipients.map((r) => [r.nombre, r.empresa, r.cargo, r.correo, r.created_at]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "destinatarios-aidr.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {[
          { label: "En BD", value: data.total_db, color: "#7A90B0" },
          { label: "A enviar", value: data.to_send, color: "#63D89A" },
          { label: "Excluidos", value: data.excluded_count, color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#102044", borderRadius: "0.6rem", padding: "0.75rem 1.1rem", minWidth: "100px" }}>
            <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ margin: "4px 0 0", fontSize: "0.7rem", color: "#7A90B0", textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.85rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, empresa o correo…"
          style={{ flex: 1, minWidth: "200px", padding: "0.5rem 0.8rem", borderRadius: "0.5rem", border: "1px solid #1B2D50", background: "#0D1B3E", color: "#F5F7FA", fontSize: "0.82rem" }}
        />
        <button
          onClick={() => setShowExcluded(!showExcluded)}
          style={{ padding: "0.5rem 0.9rem", borderRadius: "0.5rem", border: "1px solid #1B2D50", background: showExcluded ? "#F59E0B22" : "transparent", color: showExcluded ? "#F59E0B" : "#7A90B0", fontSize: "0.78rem", cursor: "pointer" }}
        >
          {showExcluded ? "Ver a enviar" : "Ver excluidos"}
        </button>
        <button
          onClick={exportCsv}
          style={{ padding: "0.5rem 0.9rem", borderRadius: "0.5rem", border: "1px solid #1B2D50", background: "transparent", color: "#63D89A", fontSize: "0.78rem", cursor: "pointer" }}
        >
          CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1B2D50" }}>
              {["#", "Nombre", "Empresa", "Cargo", "Correo"].map((h) => (
                <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#7A90B0", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", fontSize: "0.7rem", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #102044" }}>
                <td style={{ padding: "0.55rem 0.75rem", color: "#3A5070" }}>{i + 1}</td>
                <td style={{ padding: "0.55rem 0.75rem", color: "#F5F7FA", whiteSpace: "nowrap" }}>{r.nombre}</td>
                <td style={{ padding: "0.55rem 0.75rem", color: "#B9C4D3", whiteSpace: "nowrap" }}>{r.empresa}</td>
                <td style={{ padding: "0.55rem 0.75rem", color: "#7A90B0", fontSize: "0.72rem" }}>{r.cargo}</td>
                <td style={{ padding: "0.55rem 0.75rem", color: "#63D89A", fontFamily: "monospace" }}>{r.correo}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "#3A5070", fontStyle: "italic" }}>Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Preview tab ──────────────────────────────────────────────────────────────
function PreviewTab({ adminKey, campaign }: { adminKey: string; campaign: string }) {
  const previewUrl = `/api/mailing/preview?campaign=${campaign}&key=${encodeURIComponent(adminKey)}`;
  return (
    <div>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "#7A90B0" }}>
        Vista previa del correo tal como lo recibirá el destinatario (sin personalización de nombre).
      </p>
      <div style={{ border: "1px solid #1B2D50", borderRadius: "0.75rem", overflow: "hidden", background: "#060E1E" }}>
        <iframe
          src={previewUrl}
          title="Email preview"
          style={{ width: "100%", height: "680px", border: "none", display: "block" }}
        />
      </div>
    </div>
  );
}

// ─── Send tab ─────────────────────────────────────────────────────────────────
function SendTab({ adminKey, campaign, recipientCount }: { adminKey: string; campaign: string; recipientCount: number }) {
  const [testEmail, setTestEmail] = useState("salvador.ruiz@synappssys.com");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function doSend(mode: "test" | "broadcast") {
    setSending(true);
    setResult(null);
    try {
      const body = mode === "test"
        ? { campaign, mode: "test", test_to: testEmail }
        : { campaign, mode: "broadcast" };
      const res = await fetch("/api/mailing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as SendResult;
      setResult(data);
    } catch {
      setResult({ ok: false, mode, error: "Fallo de conexión." });
    } finally {
      setSending(false);
      setConfirmed(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "560px" }}>

      {/* Test section */}
      <div style={{ background: "#102044", border: "1px solid #1B2D50", borderRadius: "0.85rem", padding: "1.25rem" }}>
        <p style={{ margin: "0 0 0.85rem", fontSize: "0.72rem", fontWeight: 700, color: "#63D89A", textTransform: "uppercase", letterSpacing: ".08em" }}>Envío de prueba</p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            style={{ flex: 1, padding: "0.6rem 0.85rem", borderRadius: "0.5rem", border: "1px solid #1B2D50", background: "#0D1B3E", color: "#F5F7FA", fontSize: "0.85rem" }}
          />
          <button
            onClick={() => doSend("test")}
            disabled={sending || !testEmail.includes("@")}
            style={{ padding: "0.6rem 1.1rem", borderRadius: "0.5rem", background: sending ? "#1E3A2A" : "#1A9150", color: "#fff", fontSize: "0.85rem", fontWeight: 700, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {sending ? "Enviando…" : "Enviar prueba"}
          </button>
        </div>
      </div>

      {/* Broadcast section */}
      <div style={{ background: "#102044", border: "1px solid #1B2D50", borderRadius: "0.85rem", padding: "1.25rem" }}>
        <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: ".08em" }}>Broadcast</p>
        <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#B9C4D3" }}>
          Enviará a <strong style={{ color: "#F5F7FA" }}>{recipientCount} destinatarios</strong> de la base de datos.
          Esta acción no se puede deshacer.
        </p>
        {!confirmed ? (
          <button
            onClick={() => setConfirmed(true)}
            disabled={sending || recipientCount === 0}
            style={{ padding: "0.7rem 1.5rem", borderRadius: "0.5rem", background: "#7F1D1D", border: "1px solid #DC2626", color: "#FCA5A5", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
          >
            Iniciar broadcast ({recipientCount})
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#FCA5A5" }}>¿Confirmas el envío a {recipientCount} personas?</p>
            <button
              onClick={() => doSend("broadcast")}
              disabled={sending}
              style={{ padding: "0.6rem 1.1rem", borderRadius: "0.5rem", background: "#DC2626", color: "#fff", fontSize: "0.82rem", fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              {sending ? "Enviando…" : "Confirmar"}
            </button>
            <button
              onClick={() => setConfirmed(false)}
              style={{ padding: "0.6rem 0.9rem", borderRadius: "0.5rem", background: "transparent", border: "1px solid #1B2D50", color: "#7A90B0", fontSize: "0.82rem", cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: result.ok ? "#0D2A1A" : "#2A0D0D", border: `1px solid ${result.ok ? "#1E5C38" : "#5C1E1E"}`, borderRadius: "0.75rem", padding: "1rem 1.25rem" }}>
          {result.ok ? (
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "0.85rem", fontWeight: 700, color: "#63D89A" }}>
                {result.mode === "test" ? `Prueba enviada a ${result.sent_to}` : `Broadcast completado`}
              </p>
              {result.mode === "broadcast" && (
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#B9C4D3" }}>
                  Enviados: {result.sent} / Fallidos: {result.failed}
                </p>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#FCA5A5" }}>Error: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function MailingDashboard() {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState("aidr");
  const [tab, setTab] = useState<Tab>("recipients");
  const [recipientsData, setRecipientsData] = useState<RecipientsData | null>(null);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const loadedRef = useRef(false);

  async function loadRecipients(key: string) {
    setRecipientsLoading(true);
    try {
      const res = await fetch("/api/mailing/recipients", {
        headers: { "x-admin-key": key },
      });
      const data = (await res.json()) as RecipientsData;
      setRecipientsData(data);
    } catch {
      // silently fail
    } finally {
      setRecipientsLoading(false);
    }
  }

  function handleAuth(key: string) {
    setAdminKey(key);
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadRecipients(key);
    }
  }

  if (!adminKey) return <AuthGate onAuth={handleAuth} />;

  const campaign = CAMPAIGNS.find((c) => c.key === selectedCampaign)!;

  return (
    <div style={{ minHeight: "100vh", background: "#0A1228", color: "#F5F7FA", fontFamily: "Arial, Helvetica, sans-serif" }}>

      {/* Top bar */}
      <div style={{ background: "#0D1B3E", borderBottom: "1px solid #1B2D50", padding: "0.85rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#F5F7FA", letterSpacing: ".02em" }}>Mailing Studio</span>
        <span style={{ fontSize: "0.72rem", color: "#3A5070" }}>|</span>
        <span style={{ fontSize: "0.75rem", color: "#7A90B0" }}>SynAppsSys × ThreatDown</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.6rem" }}>
          <a href="/prospectos" style={{ fontSize: "0.72rem", padding: "0.3rem 0.75rem", borderRadius: "0.4rem", background: "transparent", color: "#7A90B0", border: "1px solid #1B2D50", textDecoration: "none" }}>
            Prospectos
          </a>
          <button
            onClick={() => { setAdminKey(null); loadedRef.current = false; setRecipientsData(null); }}
            style={{ fontSize: "0.72rem", padding: "0.3rem 0.75rem", borderRadius: "0.4rem", background: "transparent", color: "#7A90B0", border: "1px solid #1B2D50", cursor: "pointer" }}
          >
            Salir
          </button>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 50px)" }}>

        {/* Sidebar: campaigns */}
        <aside style={{ width: "220px", flexShrink: 0, background: "#0D1B3E", borderRight: "1px solid #1B2D50", padding: "1.25rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <p style={{ margin: "0 0 0.75rem 0.5rem", fontSize: "0.68rem", fontWeight: 700, color: "#3A5070", textTransform: "uppercase", letterSpacing: ".08em" }}>Campañas</p>
          {CAMPAIGNS.map((c) => (
            <button
              key={c.key}
              onClick={() => setSelectedCampaign(c.key)}
              style={{
                width: "100%", textAlign: "left", padding: "0.65rem 0.75rem", borderRadius: "0.5rem",
                border: "none", cursor: "pointer",
                background: selectedCampaign === c.key ? "#102044" : "transparent",
                color: selectedCampaign === c.key ? "#F5F7FA" : "#7A90B0",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700 }}>{c.label}</p>
              <p style={{ margin: "2px 0 0", fontSize: "0.68rem", color: c.color }}>{c.tag}</p>
            </button>
          ))}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: "1.5rem", overflowX: "hidden" }}>

          {/* Campaign header */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", background: campaign.color, color: "#061A10", fontSize: "11px", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", padding: "4px 14px", borderRadius: "20px" }}>
                {campaign.tag}
              </span>
              <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#F5F7FA" }}>{campaign.label}</h1>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0", marginBottom: "1.5rem", borderBottom: "1px solid #1B2D50" }}>
            {([["recipients", "Destinatarios"], ["preview", "Preview"], ["send", "Enviar"]] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: "0.55rem 1.1rem", border: "none", cursor: "pointer", background: "transparent",
                  fontSize: "0.82rem", fontWeight: tab === key ? 700 : 400,
                  color: tab === key ? "#63D89A" : "#7A90B0",
                  borderBottom: `2px solid ${tab === key ? "#63D89A" : "transparent"}`,
                  marginBottom: "-1px",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "recipients" && (
            <RecipientsTab data={recipientsData} loading={recipientsLoading} />
          )}
          {tab === "preview" && (
            <PreviewTab adminKey={adminKey} campaign={selectedCampaign} />
          )}
          {tab === "send" && (
            <SendTab
              adminKey={adminKey}
              campaign={selectedCampaign}
              recipientCount={recipientsData?.to_send ?? 0}
            />
          )}
        </main>
      </div>
    </div>
  );
}
