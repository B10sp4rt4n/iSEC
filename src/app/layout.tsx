import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iSEC Infosecurity | ThreatDown",
  description: "Registro de contacto para soluciones THREATDOWN en ciberseguridad aplicada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
