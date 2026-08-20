"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemoRegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nombre: "", empresa: "", cargo: "", correo: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/demo/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error al registrar");
      router.push("/demo/gracias");
    } catch {
      setError("Ocurrió un error. Intenta de nuevo.");
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen" style={{ background: "#0D1520", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>

      {/* Demo badge */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <span style={{ display: "inline-block", background: "rgba(196,125,8,.15)", color: "#F0A020", border: "1px solid rgba(196,125,8,.35)", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", padding: "4px 14px", marginBottom: 20 }}>
          Demo del sistema
        </span>
        <h1 style={{ fontFamily: "system-ui, sans-serif", fontSize: "clamp(24px,5vw,36px)", fontWeight: 800, color: "#EDF0F4", marginBottom: 10, lineHeight: 1.2 }}>
          Así se registran tus asistentes
        </h1>
        <p style={{ color: "#7E8EA3", fontSize: 15, maxWidth: 420, margin: "0 auto" }}>
          Llena el formulario como si fueras un visitante del stand. Verás tu registro aparecer en el CRM en tiempo real.
        </p>
      </div>

      {/* Form card */}
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 440, background: "#131F30", border: "1px solid #1E2D40", borderRadius: 12, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 18 }}>

        {[
          { key: "nombre",  label: "Nombre completo",  type: "text",  placeholder: "Ej. María González" },
          { key: "empresa", label: "Empresa",           type: "text",  placeholder: "Ej. Grupo Industrial MX" },
          { key: "cargo",   label: "Cargo",             type: "text",  placeholder: "Ej. Director de TI" },
          { key: "correo",  label: "Correo corporativo", type: "email", placeholder: "tu@empresa.com" },
        ].map(({ key, label, type, placeholder }) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#8B9099", letterSpacing: ".06em", textTransform: "uppercase" }}>
              {label}
            </label>
            <input
              type={type}
              required
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              style={{
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 7,
                padding: "12px 14px",
                color: "#EDF0F4",
                fontSize: 15,
                outline: "none",
                transition: "border-color .15s",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(196,125,8,.6)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")}
            />
          </div>
        ))}

        {error && <p style={{ color: "#F87171", fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          disabled={sending}
          style={{
            marginTop: 8,
            background: "#C47D08",
            color: "#0A1018",
            border: "none",
            borderRadius: 7,
            padding: "14px",
            fontSize: 15,
            fontWeight: 700,
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? .7 : 1,
            transition: "opacity .15s",
          }}
        >
          {sending ? "Registrando…" : "Registrarme →"}
        </button>

        <p style={{ fontSize: 12, color: "#4A5568", textAlign: "center", marginTop: 4 }}>
          Simulación ilustrativa · Los datos no se usarán para ningún fin comercial
        </p>
      </form>
    </main>
  );
}
