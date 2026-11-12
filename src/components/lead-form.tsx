"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  nombre: string;
  empresa: string;
  cargo: string;
  correo: string;
  telefono: string;
  pregunta_cerrada_1: string;
  pregunta_cerrada_2: string;
  dolor_reto: string;
  contexto_orbita?: string;
};

// ---------------------------------------------------------------------------
// Scoring types & question configuration
// ---------------------------------------------------------------------------

type QuestionOption = {
  value: string;
  label: string;
  score: number;
};

type ClosedQuestion = {
  label: string;
  name: keyof FormState;
  maxScore: number;
  options: QuestionOption[];
};

const PREGUNTA_CERRADA_1: ClosedQuestion = {
  label: "1. ¿Qué riesgo te preocupa más en tu empresa?",
  name: "pregunta_cerrada_1",
  maxScore: 10,
  options: [
    { value: "ransomware",  label: "Ransomware",                            score: 10 },
    { value: "phishing",    label: "Phishing o correo malicioso",           score: 8  },
    { value: "visibilidad", label: "Falta de visibilidad sobre equipos",    score: 5  },
    { value: "navegacion",  label: "Navegación o acceso a sitios riesgosos", score: 3 },
  ],
};

const PREGUNTA_CERRADA_2: ClosedQuestion = {
  label: "2. ¿Tu empresa tiene forma de detectar qué pasó dentro de un equipo cuando ocurre algo sospechoso?",
  name: "pregunta_cerrada_2",
  maxScore: 10,
  options: [
    { value: "no",        label: "No",               score: 10 },
    { value: "no_seguro", label: "No estoy seguro",   score: 7  },
    { value: "si",        label: "Sí",                score: 2  },
  ],
};

function getOrbitaContexto(): string {
  try {
    const frente = sessionStorage.getItem("orbita_frente") ?? "";
    const escenario = sessionStorage.getItem("orbita_escenario") ?? "";
    if (escenario) return `${frente}|${escenario}`;
    if (frente) return frente;
  } catch { /* sessionStorage no disponible */ }
  return "";
}

const initialState: FormState = {
  nombre: "",
  empresa: "",
  cargo: "",
  correo: "",
  telefono: "",
  pregunta_cerrada_1: "",
  pregunta_cerrada_2: "",
  dolor_reto: "",
  contexto_orbita: "",
};

export default function LeadForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    ...initialState,
    contexto_orbita: getOrbitaContexto(),
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  const onEmailBlur = async () => {
    const email = form.correo.trim();
    if (!email || !email.includes("@")) return;
    setEmailChecking(true);
    setEmailError(null);
    setEmailValid(null);
    try {
      const res = await fetch(`/api/validate-email?email=${encodeURIComponent(email)}`);
      const data = (await res.json()) as { valid: boolean; reason?: string };
      if (data.valid) {
        setEmailValid(true);
      } else {
        setEmailError(data.reason ?? "Correo inválido.");
        setEmailValid(false);
      }
    } catch {
      // Si falla la red, no bloqueamos
      setEmailValid(true);
    } finally {
      setEmailChecking(false);
    }
  };

  const onChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setField = (name: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    if (emailValid === false) {
      setError("Por favor corrige el correo antes de continuar.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/prospects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "No fue posible guardar el registro.");
      }

      router.push("/gracias");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Ocurrio un error inesperado.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card rounded-3xl p-6 md:p-8">
      <h1 className="title-font mb-2 text-3xl font-bold">Registro de contacto</h1>
      <p className="mb-6 text-sm text-slate-700">
        Completa tus datos para continuar la conversacion despues del evento.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Nombre
          <input
            required
            name="nombre"
            value={form.nombre}
            onChange={onChange}
            className="field"
            placeholder="Ej. Ana Torres"
          />
        </label>

        <label className="space-y-1 text-sm font-medium">
          Empresa
          <input
            required
            name="empresa"
            value={form.empresa}
            onChange={onChange}
            className="field"
            placeholder="Ej. Logistica MX"
          />
        </label>

        <label className="space-y-1 text-sm font-medium">
          Cargo
          <select
            required
            name="cargo"
            value={form.cargo}
            onChange={onChange}
            className="field"
          >
            <option value="">Selecciona tu cargo</option>
            <optgroup label="Dirección / C-Level">
              <option value="ciso">CISO / Director de Seguridad</option>
              <option value="cio_cto">CIO / CTO / Director de TI</option>
              <option value="director_ops">Director de Operaciones</option>
              <option value="director_gral">Director General / CEO</option>
            </optgroup>
            <optgroup label="Gerencia / Jefatura">
              <option value="gerente_ti">Gerente de TI / Infraestructura</option>
              <option value="gerente_seguridad">Gerente de Seguridad</option>
              <option value="jefe_ti">Jefe de TI / Soporte</option>
            </optgroup>
            <optgroup label="Técnico / Operativo">
              <option value="admin_sistemas">Administrador de Sistemas / Redes</option>
              <option value="ingeniero_seguridad">Ingeniero de Seguridad</option>
              <option value="analista_ti">Analista / Técnico de TI</option>
            </optgroup>
            <optgroup label="Reseller / Integrador / Canal">
              <option value="reseller_ventas">Ejecutivo de Ventas (Reseller / Canal)</option>
              <option value="reseller_preventa">Preventa / Sales Engineer (Canal)</option>
              <option value="reseller_gerente">Gerente de Canal / Partner Manager</option>
              <option value="reseller">Consultor / Integrador Técnico</option>
            </optgroup>
            <optgroup label="Fabricante / Vendor">
              <option value="vendor_am">Account Manager (Fabricante / Vendor)</option>
              <option value="vendor_se">Sales Engineer / Preventa (Vendor)</option>
              <option value="vendor_channel">Channel Manager (Fabricante)</option>
              <option value="vendor_mktg">Marketing / Desarrollo de Negocio (Vendor)</option>
            </optgroup>
            <optgroup label="Otro">
              <option value="otro">Otro</option>
            </optgroup>
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium">
          Correo empresarial
          <input
            required
            type="email"
            name="correo"
            value={form.correo}
            onChange={(e) => { onChange(e); setEmailValid(null); setEmailError(null); }}
            onBlur={onEmailBlur}
            className={`field ${
              emailValid === false
                ? "border-red-500 focus:ring-red-400"
                : emailValid === true
                ? "border-emerald-500 focus:ring-emerald-400"
                : ""
            }`}
            placeholder="nombre@empresa.com"
          />
          {emailChecking && (
            <span className="text-xs text-slate-400">Verificando dominio...</span>
          )}
          {emailError && (
            <span className="text-xs text-red-600">{emailError}</span>
          )}
          {emailValid === true && (
            <span className="text-xs text-emerald-600">✓ Correo empresarial válido</span>
          )}
        </label>

        <label className="space-y-1 text-sm font-medium md:col-span-2">
          Telefono (opcional)
          <input
            name="telefono"
            value={form.telefono}
            onChange={onChange}
            className="field"
            placeholder="Ej. +52 55 1234 5678"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-5">
        <RadioGroup
          question={PREGUNTA_CERRADA_1}
          selected={form.pregunta_cerrada_1}
          onChange={(v) => setField("pregunta_cerrada_1", v)}
        />

        <RadioGroup
          question={PREGUNTA_CERRADA_2}
          selected={form.pregunta_cerrada_2}
          onChange={(v) => setField("pregunta_cerrada_2", v)}
        />

        <label className="space-y-1 text-sm font-medium">
          3. Cuando evalúan ciberseguridad, ¿qué pesa más para ustedes?
          <select
            required
            name="dolor_reto"
            value={form.dolor_reto}
            onChange={onChange}
            className="field"
          >
            <option value="">Selecciona una opción</option>
            <option value="prevenir">Prevenir incidentes</option>
            <option value="visibilidad_control">Tener visibilidad y control</option>
            <option value="reducir_carga">Reducir carga operativa al equipo</option>
            <option value="cumplimiento">Cumplimiento o tranquilidad para dirección</option>
          </select>
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <button
        disabled={isSaving}
        className="btn-primary mt-6 w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-70"
        type="submit"
      >
        {isSaving ? "Guardando..." : "Enviar registro"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// RadioGroup sub-component — renders options with score/maxScore badges
// ---------------------------------------------------------------------------

function RadioGroup({
  question,
  selected,
  onChange,
}: {
  question: ClosedQuestion;
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{question.label}</legend>
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`radio-option${isSelected ? " radio-option--selected" : ""}`}
              aria-pressed={isSelected}
            >
              <span className="radio-dot" data-selected={isSelected}>
                {isSelected && <span className="radio-dot-inner" />}
              </span>
              <span className="flex-1 text-left text-sm">{opt.label}</span>
              <span className={`score-badge${isSelected ? " score-badge--selected" : ""}`}>
                {opt.score}/{question.maxScore}
              </span>
            </button>
          );
        })}
      </div>
      {/* Hidden input keeps browser required-validation working */}
      <input
        type="text"
        name={question.name}
        value={selected}
        required
        readOnly
        className="sr-only"
        tabIndex={-1}
      />
    </fieldset>
  );
}
