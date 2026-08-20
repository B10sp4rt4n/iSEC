"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DemoGraciasPage() {
  const router = useRouter();
  const [count, setCount] = useState(4);

  useEffect(() => {
    const t = setInterval(() => setCount(c => c - 1), 1000);
    const redirect = setTimeout(() => router.push("/demo/crm"), 4000);
    return () => { clearInterval(t); clearTimeout(redirect); };
  }, [router]);

  return (
    <main style={{ minHeight: "100vh", background: "#0D1520", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>

      <div style={{ fontSize: 56, marginBottom: 24 }}>✅</div>

      <h1 style={{ fontFamily: "system-ui, sans-serif", fontSize: "clamp(24px,4vw,36px)", fontWeight: 800, color: "#EDF0F4", marginBottom: 12, lineHeight: 1.2 }}>
        ¡Registro exitoso!
      </h1>

      <p style={{ color: "#7E8EA3", fontSize: 16, maxWidth: 400, marginBottom: 36, lineHeight: 1.65 }}>
        Así ven el formulario tus asistentes. Ahora ve cómo aparece tu registro en el CRM en tiempo real.
      </p>

      <a
        href="/demo/crm"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#C47D08", color: "#0A1018",
          fontWeight: 700, fontSize: 15,
          padding: "14px 28px", borderRadius: 7,
          textDecoration: "none", marginBottom: 20,
        }}
      >
        Ver el CRM en vivo →
      </a>

      <p style={{ color: "#4A5568", fontSize: 13 }}>
        Redirigiendo en {count}…
      </p>
    </main>
  );
}
