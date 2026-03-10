"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormData {
  nombre: string;
  empresa: string;
  cargo: string;
  correo: string;
  telefono: string;
  respuesta_cerrada_1: string;
  respuesta_cerrada_2: string;
  respuesta_abierta: string;
}

interface FieldErrors {
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// Questions configuration
// (easy to update per event without touching the rest of the code)
// ---------------------------------------------------------------------------

const PREGUNTA_CERRADA_1 = {
  label: "¿Cuál es el tamaño de tu empresa?",
  options: [
    "1 – 10 empleados",
    "11 – 50 empleados",
    "51 – 200 empleados",
    "Más de 200 empleados",
  ],
};

const PREGUNTA_CERRADA_2 = {
  label: "¿En qué área usas o te interesa usar tecnología?",
  options: [
    "Finanzas y Contabilidad",
    "Operaciones y Logística",
    "Ventas y CRM",
    "Recursos Humanos",
    "Toda la empresa (ERP)",
  ],
};

const PREGUNTA_ABIERTA =
  "¿Cuál es tu principal dolor o reto de negocio actualmente?";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EMPTY_FORM: FormData = {
  nombre: "",
  empresa: "",
  cargo: "",
  correo: "",
  telefono: "",
  respuesta_cerrada_1: "",
  respuesta_cerrada_2: "",
  respuesta_abierta: "",
};

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Input handlers ──────────────────────────────────────────────────────

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function handleRadio(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  // ── Client-side validation ───────────────────────────────────────────────

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!form.nombre.trim()) errors.nombre = "El nombre es obligatorio.";
    if (!form.correo.trim()) {
      errors.correo = "El correo es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
      errors.correo = "El correo no tiene un formato válido.";
    }
    if (form.telefono && !/^[+\d][\d\s\-().]{6,19}$/.test(form.telefono)) {
      errors.telefono = "El teléfono no tiene un formato válido.";
    }
    if (!form.respuesta_cerrada_1)
      errors.respuesta_cerrada_1 = "Por favor selecciona una opción.";
    if (!form.respuesta_cerrada_2)
      errors.respuesta_cerrada_2 = "Por favor selecciona una opción.";
    if (!form.respuesta_abierta.trim())
      errors.respuesta_abierta = "Por favor describe tu reto principal.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push("/gracias");
        return;
      }

      const data = await res.json();
      if (data.errors) {
        setSubmitError(data.errors.join(" "));
      } else {
        setSubmitError(data.error ?? "Error inesperado. Intenta de nuevo.");
      }
    } catch (err) {
      console.error("Error al enviar el formulario:", err);
      setSubmitError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--gray-50)" }}>
      {/* Header */}
      <header className="gradient-header text-white px-6 py-4 flex items-center gap-3 shadow-md">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            S
          </div>
          <span className="font-bold text-lg tracking-tight">SynAppsSys</span>
        </Link>
      </header>

      {/* Progress indicator */}
      <div className="gradient-header text-white text-center py-5 px-6">
        <h1 className="text-xl font-bold">Formulario de Registro</h1>
        <p className="text-sm opacity-80 mt-1">
          Completa los datos a continuación · 2 minutos aprox.
        </p>
      </div>

      {/* Form card */}
      <section className="flex-1 px-4 py-8 max-w-xl mx-auto w-full">
        <form onSubmit={handleSubmit} noValidate className="card p-6 sm:p-8 space-y-6">

          {/* ── Contact data ── */}
          <div>
            <h2
              className="font-bold text-base mb-4 pb-2 border-b"
              style={{ color: "var(--primary)", borderColor: "var(--gray-200)" }}
            >
              Datos de contacto
            </h2>
            <div className="space-y-4">
              <Field
                label="Nombre completo *"
                error={fieldErrors.nombre}
              >
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej. María González"
                  className={`form-input ${fieldErrors.nombre ? "error" : ""}`}
                  autoComplete="name"
                />
              </Field>

              <Field label="Empresa" error={fieldErrors.empresa}>
                <input
                  type="text"
                  name="empresa"
                  value={form.empresa}
                  onChange={handleChange}
                  placeholder="Ej. Grupo Industrial ABC"
                  className="form-input"
                  autoComplete="organization"
                />
              </Field>

              <Field label="Cargo" error={fieldErrors.cargo}>
                <input
                  type="text"
                  name="cargo"
                  value={form.cargo}
                  onChange={handleChange}
                  placeholder="Ej. Director de Operaciones"
                  className="form-input"
                  autoComplete="organization-title"
                />
              </Field>

              <Field
                label="Correo electrónico *"
                error={fieldErrors.correo}
              >
                <input
                  type="email"
                  name="correo"
                  value={form.correo}
                  onChange={handleChange}
                  placeholder="correo@empresa.com"
                  className={`form-input ${fieldErrors.correo ? "error" : ""}`}
                  autoComplete="email"
                  inputMode="email"
                />
              </Field>

              <Field
                label="Teléfono (opcional)"
                error={fieldErrors.telefono}
              >
                <input
                  type="tel"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="+52 55 1234 5678"
                  className={`form-input ${fieldErrors.telefono ? "error" : ""}`}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </Field>
            </div>
          </div>

          {/* ── Closed question 1 ── */}
          <div>
            <h2
              className="font-bold text-base mb-4 pb-2 border-b"
              style={{ color: "var(--primary)", borderColor: "var(--gray-200)" }}
            >
              Preguntas rápidas
            </h2>
            <RadioGroup
              label={`${PREGUNTA_CERRADA_1.label} *`}
              options={PREGUNTA_CERRADA_1.options}
              selected={form.respuesta_cerrada_1}
              onChange={(v) => handleRadio("respuesta_cerrada_1", v)}
              error={fieldErrors.respuesta_cerrada_1}
            />
          </div>

          {/* ── Closed question 2 ── */}
          <RadioGroup
            label={`${PREGUNTA_CERRADA_2.label} *`}
            options={PREGUNTA_CERRADA_2.options}
            selected={form.respuesta_cerrada_2}
            onChange={(v) => handleRadio("respuesta_cerrada_2", v)}
            error={fieldErrors.respuesta_cerrada_2}
          />

          {/* ── Open question ── */}
          <Field
            label={`${PREGUNTA_ABIERTA} *`}
            error={fieldErrors.respuesta_abierta}
          >
            <textarea
              name="respuesta_abierta"
              value={form.respuesta_abierta}
              onChange={handleChange}
              rows={4}
              placeholder="Describe brevemente el reto más importante que enfrentas en tu negocio…"
              className={`form-input resize-none ${fieldErrors.respuesta_abierta ? "error" : ""}`}
            />
          </Field>

          {/* ── Submit error ── */}
          {submitError && (
            <div
              className="text-sm px-4 py-3 rounded-lg"
              style={{ background: "#fee2e2", color: "var(--error)" }}
              role="alert"
            >
              {submitError}
            </div>
          )}

          {/* ── Submit button ── */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando…
              </>
            ) : (
              "Enviar registro →"
            )}
          </button>

          <p className="text-center text-xs" style={{ color: "var(--gray-600)" }}>
            * Campos obligatorios · Tus datos están protegidos y serán usados
            únicamente para fines de seguimiento comercial.
          </p>
        </form>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-4 text-center text-xs border-t"
        style={{ color: "var(--gray-600)", borderColor: "var(--gray-200)" }}
      >
        © {new Date().getFullYear()} SynAppsSys · Todos los derechos reservados
      </footer>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
      {error && (
        <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function RadioGroup({
  label,
  options,
  selected,
  onChange,
  error,
}: {
  label: string;
  options: string[];
  selected: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="space-y-2 mt-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`radio-option w-full text-left ${selected === opt ? "selected" : ""}`}
          >
            <span
              className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
              style={{
                borderColor: selected === opt ? "var(--primary)" : "var(--gray-200)",
              }}
            >
              {selected === opt && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              )}
            </span>
            {opt}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
