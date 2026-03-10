import Link from "next/link";

export default function Home() {
  return (
    <main className="mesh-bg min-h-screen p-6 md:p-12">
      <section className="mx-auto flex min-h-[86vh] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 md:grid-cols-2">
          <article className="card rounded-3xl p-8 md:p-12">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
              ISEC INFOECURITY / THREATDOWN / SYN APPS SYS
            </p>
            <h1 className="title-font mb-4 text-4xl leading-tight font-bold md:text-5xl">
              Hablemos de ciberseguridad aplicada para proteger y acelerar tu operacion
            </h1>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-700 md:text-lg">
              Comparte tus datos y te mostraremos un enfoque claro de THREATDOWN
              con acciones practicas para fortalecer seguridad, integracion y analitica
              en tu negocio.
            </p>
            <Link
              href="/registro"
              className="btn-primary inline-flex items-center px-6 py-3"
            >
              Registrarme ahora
            </Link>
          </article>

          <aside className="card rounded-3xl p-8 md:p-10">
            <h2 className="title-font mb-5 text-2xl font-semibold">
              Que obtendras con THREATDOWN
            </h2>
            <ul className="space-y-3 text-slate-700">
              <li>Visibilidad de riesgos prioritarios en tu operacion.</li>
              <li>Ruta de accion para prevenir, detectar y responder incidentes.</li>
              <li>
                Acompanamiento experto para fortalecer continuidad y cumplimiento.
              </li>
            </ul>
            <div className="mt-8 rounded-2xl bg-[#12213a] p-5 text-[#f8f3e8]">
              <p className="text-sm leading-relaxed">
                Recomendacion: cuentanos tu principal reto de seguridad y te
                compartiremos acciones concretas para resolverlo con THREATDOWN.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
