import Link from "next/link";

export default function Home() {
  return (
    <main className="mesh-bg min-h-screen p-6 md:p-12">
      <section className="mx-auto flex min-h-[86vh] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 md:grid-cols-2">
          <article className="card rounded-3xl p-8 md:p-12">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
              SynAppsSys en eventos
            </p>
            <h1 className="title-font mb-4 text-4xl leading-tight font-bold md:text-5xl">
              Conecta con nuestro equipo y descubre como acelerar tus procesos
            </h1>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-700 md:text-lg">
              Deja tus datos en menos de 1 minuto y te compartiremos ideas concretas
              para automatizacion, integracion y analitica aplicadas a tu negocio.
            </p>
            <Link
              href="/registro"
              className="btn-primary inline-flex items-center px-6 py-3"
            >
              Registrarme ahora
            </Link>
          </article>

          <aside className="card rounded-3xl p-8 md:p-10">
            <h2 className="title-font mb-5 text-2xl font-semibold">Que obtendras</h2>
            <ul className="space-y-3 text-slate-700">
              <li>Diagnostico inicial de retos operativos.</li>
              <li>Recomendaciones segun tu industria.</li>
              <li>Contacto directo para una demo especializada.</li>
            </ul>
            <div className="mt-8 rounded-2xl bg-[#12213a] p-5 text-[#f8f3e8]">
              <p className="text-sm leading-relaxed">
                Consejo: comparte el principal dolor de tu operacion para prepararte
                una conversacion de alto valor.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
