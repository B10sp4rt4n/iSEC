import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SynAppsSys – Eventos y Captación",
  description:
    "Regístrate en nuestros eventos y dinámicas. Plataforma de captación comercial de SynAppsSys.",
  keywords: "SynAppsSys, eventos, tecnología, registro, ERP, software empresarial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
