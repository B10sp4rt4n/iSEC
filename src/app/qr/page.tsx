"use client";

import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";

const REGISTRO_URL =
  process.env.NEXT_PUBLIC_REGISTRO_URL ??
  "https://registro.synappssys.com";

export default function QRPage() {
  return (
    <main className="mesh-bg flex min-h-screen flex-col items-center justify-center gap-8 p-8 print:bg-white">
      <div className="flex flex-col items-center gap-6 rounded-3xl bg-white p-10 shadow-lg print:shadow-none">
        <Image
          src="/logos/threatdown-logo.png"
          alt="ThreatDown logo"
          width={180}
          height={48}
          className="object-contain"
        />
        <p className="text-center text-sm text-slate-600">
          Escanea el QR para registrarte y continuar la conversacion
        </p>

        <div className="rounded-2xl border-4 border-[#0a8f79] p-4">
          <QRCodeSVG
            value={REGISTRO_URL}
            size={260}
            fgColor="#162036"
            bgColor="#ffffff"
            level="M"
          />
        </div>

        <a
          href={REGISTRO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-center text-xs text-[#0a8f79] underline hover:text-[#066d5c]"
        >
          {REGISTRO_URL}
        </a>
      </div>

      <button
        onClick={() => window.print()}
        className="rounded-xl bg-[#0a8f79] px-6 py-3 text-sm font-semibold text-white hover:bg-[#066d5c] print:hidden"
      >
        Imprimir / Guardar PDF
      </button>
    </main>
  );
}
