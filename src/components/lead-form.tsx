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
          Correo
          <input
            required
            type="email"
            name="correo"
            value={form.correo}
            onChange={onChange}
            className="field"
            placeholder="nombre@empresa.com"
          />
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
          Pregunta cerrada 1: Que solucion te interesa mas?
          <select
            required
            name="pregunta_cerrada_1"
            value={form.pregunta_cerrada_1}
            onChange={onChange}
            className="field"
          >
            <option value="">Selecciona una opcion</option>
            <option value="automatizacion">Automatizacion de procesos</option>
            <option value="integracion">Integracion de sistemas</option>
            <option value="analitica">Analitica y tableros</option>
            <option value="ia">IA aplicada al negocio</option>
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium md:col-span-2">
          Pregunta cerrada 2: Horizonte para iniciar proyecto?
          <select
            required
            name="pregunta_cerrada_2"
            value={form.pregunta_cerrada_2}
            onChange={onChange}
            className="field"
          >
            <option value="">Selecciona una opcion</option>
            <option value="0-3_meses">0 a 3 meses</option>
            <option value="3-6_meses">3 a 6 meses</option>
            <option value="6-12_meses">6 a 12 meses</option>
            <option value="12+_meses">Mas de 12 meses</option>
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium md:col-span-2">
          Cual es tu principal dolor o reto hoy?
          <textarea
            required
            name="dolor_reto"
            value={form.dolor_reto}
            onChange={onChange}
            className="field min-h-28"
            placeholder="Comparte brevemente el reto mas importante"
          />
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
