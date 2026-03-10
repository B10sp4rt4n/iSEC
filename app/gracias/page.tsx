import Link from "next/link";

export default function GraciasPage() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--gray-50)" }}>
      {/* Header */}
      <header className="gradient-header text-white px-6 py-4 flex items-center gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            S
          </div>
          <span className="font-bold text-lg tracking-tight">SynAppsSys</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="card p-8 sm:p-10 max-w-md w-full text-center">
          {/* Success icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(16, 185, 129, 0.12)" }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="20" cy="20" r="20" fill="var(--success)" opacity="0.15" />
              <path
                d="M11 20.5L17 26.5L29 14"
                stroke="var(--success)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1
            className="text-2xl sm:text-3xl font-bold mb-3"
            style={{ color: "var(--primary)" }}
          >
            ¡Registro exitoso!
          </h1>

          <p
            className="text-base leading-relaxed mb-6"
            style={{ color: "var(--gray-600)" }}
          >
            Gracias por registrarte. Tu información fue guardada correctamente.
            <br />
            <strong style={{ color: "var(--gray-800)" }}>
              Ya estás participando en la dinámica del evento.
            </strong>
          </p>

          {/* What happens next */}
          <div
            className="text-left rounded-xl p-5 mb-6 space-y-3"
            style={{ background: "var(--gray-100)" }}
          >
            <p className="font-semibold text-sm" style={{ color: "var(--primary)" }}>
              ¿Qué sigue?
            </p>
            {nextSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "var(--accent)" }}
                >
                  {i + 1}
                </span>
                <p className="text-sm" style={{ color: "var(--gray-700)" }}>
                  {step}
                </p>
              </div>
            ))}
          </div>

          {/* Back to home */}
          <Link href="/">
            <button
              className="btn-primary w-full"
              style={{ background: "var(--primary)" }}
            >
              Volver al inicio
            </button>
          </Link>
        </div>
      </div>

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

const nextSteps = [
  "Un representante de SynAppsSys se pondrá en contacto contigo en los próximos días.",
  "Recibirás información personalizada basada en tus respuestas.",
  "Si participas en el sorteo, te notificaremos directamente.",
];
