import LeadForm from "@/components/lead-form";

export default function RegistroPage() {
  return (
    <main className="mesh-bg min-h-screen">
      {/* ── Navbar ── */}
      <nav style={{
        background: "#fff",
        borderBottom: "1px solid #d6d9ee",
        padding: "0 1.5rem",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: "1.15rem",
          color: "#1a1a3e",
          letterSpacing: "-0.01em",
        }}>
          Syn<span style={{ color: "#5b5fc7" }}>Apps</span>Sys
        </span>
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
