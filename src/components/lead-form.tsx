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
};

const initialState: FormState = {
  nombre: "",
  empresa: "",
  cargo: "",
  correo: "",
  telefono: "",
  pregunta_cerrada_1: "",
  pregunta_cerrada_2: "",
  dolor_reto: "",
};

export default function LeadForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
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
          <input
            required
            name="cargo"
            value={form.cargo}
            onChange={onChange}
            className="field"
            placeholder="Ej. Gerente de Operaciones"
          />
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

        <label className="space-y-1 text-sm font-medium md:col-span-2">
          1. ¿Qué riesgo te preocupa más en tu empresa?
          <select
            required
            name="pregunta_cerrada_1"
            value={form.pregunta_cerrada_1}
            onChange={onChange}
            className="field"
          >
            <option value="">Selecciona una opción</option>
            <option value="phishing">Phishing o correo malicioso</option>
            <option value="ransomware">Ransomware</option>
            <option value="visibilidad">Falta de visibilidad sobre equipos</option>
            <option value="navegacion">Navegación o acceso a sitios riesgosos</option>
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium md:col-span-2">
          2. ¿Tu empresa tiene forma de detectar qué pasó dentro de un equipo cuando ocurre algo sospechoso?
          <select
            required
            name="pregunta_cerrada_2"
            value={form.pregunta_cerrada_2}
            onChange={onChange}
            className="field"
          >
            <option value="">Selecciona una opción</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
            <option value="no_seguro">No estoy seguro</option>
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium md:col-span-2">
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
