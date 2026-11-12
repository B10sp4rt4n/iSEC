import Image from "next/image";
import LeadForm from "@/components/lead-form";

export default function RegistroPage() {
  return (
    <main className="mesh-bg min-h-screen">
      {/* ── Navbar ── */}
      <nav style={{
        background: "#fff",
        borderBottom: "1px solid #d6d9ee",
        padding: "0 1.5rem",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Image
          src="/logo-synappssys.png"
          alt="SynAppsSys"
          width={148}
          height={42}
          style={{ objectFit: "contain" }}
          priority
        />
        <span style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "#6b6fa8",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          Registro de contacto
        </span>
      </nav>

      {/* ── Content ── */}
      <section className="mx-auto w-full max-w-2xl px-4 py-10 md:py-14">
        <LeadForm />
      </section>
    </main>
  );
}
