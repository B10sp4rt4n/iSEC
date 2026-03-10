import Link from "next/link";

export default function GraciasPage() {
  return (
    <main className="mesh-bg flex min-h-screen items-center p-6 md:p-12">
      <section className="card mx-auto w-full max-w-2xl rounded-3xl p-8 text-center md:p-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
          Registro recibido
        </p>
        <h1 className="title-font mb-3 text-4xl font-bold">Gracias por registrarte</h1>
        <p className="mx-auto mb-7 max-w-xl text-slate-700">
          Tu informacion fue enviada correctamente. Nuestro equipo te contactara
          con propuestas concretas para tus retos.
        </p>
        <Link href="/" className="btn-primary inline-flex px-6 py-3">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
