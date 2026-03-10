import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="gradient-header text-white px-6 py-4 flex items-center gap-3 shadow-md">
        <div className="flex items-center gap-2">
          {/* Logo placeholder – swap for <Image> with real logo */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            S
          </div>
          <span className="font-bold text-xl tracking-tight">SynAppsSys</span>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="gradient-header text-white px-6 pt-10 pb-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-3">
          Evento de Networking &amp; Tecnología
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
          Conectando Soluciones
          <br />
          <span style={{ color: "#7dd3fc" }}>Impulsando Empresas</span>
        </h1>
        <p className="max-w-xl mx-auto text-base opacity-90 leading-relaxed">
          Participa en la dinámica del evento, registra tus datos y comparte tu
          principal reto de negocio. Tu información nos ayuda a ofrecerte
          soluciones reales.
        </p>
      </section>

      {/* ── Steps ── */}
      <section className="px-6 py-10 max-w-2xl mx-auto w-full">
        <h2
          className="text-center font-bold text-lg mb-8"
          style={{ color: "var(--primary)" }}
        >
          ¿Cómo funciona?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {steps.map((step) => (
            <div key={step.number} className="card p-5 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3"
                style={{ background: "var(--primary)" }}
              >
                {step.number}
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--gray-800)" }}>
                {step.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--gray-600)" }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits ── */}
      <section
        className="px-6 py-8 mx-4 sm:mx-auto sm:max-w-2xl w-auto rounded-2xl mb-8"
        style={{ background: "var(--gray-100)" }}
      >
        <h2
          className="font-bold text-base mb-4 text-center"
          style={{ color: "var(--primary)" }}
        >
          ¿Qué obtienes al registrarte?
        </h2>
        <ul className="space-y-2">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "var(--gray-700)" }}>
              <span
                className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "var(--accent)" }}
              >
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-14 text-center">
        <Link href="/registro">
          <button className="btn-primary text-lg px-10 py-4 rounded-xl shadow-lg">
            Registrarme ahora →
          </button>
        </Link>
        <p className="mt-3 text-xs" style={{ color: "var(--gray-600)" }}>
          Solo toma 2 minutos · Datos protegidos
        </p>
      </section>

      {/* ── Footer ── */}
      <footer
        className="mt-auto px-6 py-4 text-center text-xs border-t"
        style={{ color: "var(--gray-600)", borderColor: "var(--gray-200)" }}
      >
        © {new Date().getFullYear()} SynAppsSys · Todos los derechos reservados
      </footer>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const steps = [
  {
    number: "1",
    title: "Llena el formulario",
    description: "Ingresa tus datos de contacto y responde las preguntas en menos de 2 minutos.",
  },
  {
    number: "2",
    title: "Cuéntanos tu reto",
    description: "Comparte tu principal desafío de negocio para ayudarte mejor.",
  },
  {
    number: "3",
    title: "Queda registrado",
    description: "Participa en la dinámica del evento y recibe seguimiento personalizado.",
  },
];

const benefits = [
  "Participas en la dinámica del evento.",
  "Recibes información personalizada sobre soluciones relevantes para tu empresa.",
  "Acceso a diagnósticos y demos exclusivas de SynAppsSys.",
  "Te integramos a nuestra red de contactos tecnológicos y de negocio.",
];
