import Link from "next/link";
import LeadForm from "@/components/lead-form";

export default function RegistroPage() {
  return (
    <main className="mesh-bg min-h-screen p-6 md:p-12">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-5">
          <Link href="/" className="text-sm font-semibold text-emerald-800 hover:underline">
            Volver al inicio
          </Link>
        </div>
        <LeadForm />
      </section>
    </main>
  );
}
