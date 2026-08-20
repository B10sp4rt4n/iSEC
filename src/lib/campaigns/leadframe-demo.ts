export const LEADFRAME_FROM = "LeadFrame by SynAppsSys <contacto@synappssys.com>";

export function buildLeadframeDemoEmail(nombre: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Lo que acabas de vivir — LeadFrame</title>
</head>
<body style="margin:0;padding:0;background:#0A111E;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A111E;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0">

  <!-- Header -->
  <tr><td style="padding-bottom:32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:900;letter-spacing:.08em;color:#EDF0F4;">
          LEAD<span style="color:#F0A020;">FRAME</span>
        </td>
        <td align="right" style="font-size:11px;color:rgba(255,255,255,.25);">by SynAppsSys</td>
      </tr>
    </table>
  </td></tr>

  <!-- Hero -->
  <tr><td style="background:#131F30;border:1px solid #1E2D40;border-radius:12px;padding:36px 32px 32px;">

    <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#F0A020;">
      Lo que acabas de vivir
    </p>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#EDF0F4;line-height:1.25;">
      Hola ${nombre} — así funciona LeadFrame en un evento real.
    </h1>

    <p style="margin:0 0 24px;font-size:15px;color:#7E8EA3;line-height:1.7;">
      Hace un momento escaneaste un QR, llenaste un formulario en 20 segundos,
      y tu nombre apareció en un CRM en tiempo real.<br><br>
      Eso es exactamente lo que viven los prospectos de tus clientes cuando instalamos
      LeadFrame en su stand.
    </p>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td style="border-top:1px solid #1E2D40;"></td></tr>
    </table>

    <!-- Lo que incluye -->
    <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);">
      Qué incluye LeadFrame
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      ${[
        ["📲", "QR de registro configurado para tu evento", "Sin apps. Acceso en segundos desde cualquier celular."],
        ["⚡", "CRM en tiempo real", "El equipo de ventas ve los registros al instante, desde cualquier dispositivo."],
        ["🎰", "Sorteo en vivo", "Dinamiza el stand. Premia a tus prospectos. Los tienes atentos hasta el final."],
        ["📤", "Campaña de mailing post-evento", "Sale antes de 48 hrs. Llega cuando el interés todavía está caliente."],
        ["📊", "Reporte de perfiles", "Quién se registró, cuándo, y qué cargo tiene. Listo para tu equipo de ventas."],
      ].map(([ico, titulo, desc]) => `
      <tr>
        <td width="36" valign="top" style="padding:0 12px 18px 0;font-size:20px;">${ico}</td>
        <td valign="top" style="padding-bottom:18px;">
          <div style="font-size:14px;font-weight:700;color:#EDF0F4;margin-bottom:3px;">${titulo}</div>
          <div style="font-size:13px;color:#7E8EA3;line-height:1.5;">${desc}</div>
        </td>
      </tr>`).join("")}
    </table>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td style="border-top:1px solid #1E2D40;"></td></tr>
    </table>

    <!-- CTAs -->
    <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);">
      Continúa la experiencia
    </p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="background:#C47D08;border-radius:7px;">
          <a href="https://registro.synappssys.com/demo/crm" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:700;color:#0A1018;text-decoration:none;">
            Ver el CRM en vivo &rarr;
          </a>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="border:1px solid rgba(240,160,32,.3);border-radius:7px;">
          <a href="https://registro.synappssys.com/servicios" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#F0A020;text-decoration:none;">
            Ver planes y precios
          </a>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border:1px solid rgba(255,255,255,.1);border-radius:7px;">
          <a href="https://calendly.com/salvador-ruiz-synappssys" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:rgba(255,255,255,.5);text-decoration:none;">
            Agendar 30 minutos
          </a>
        </td>
      </tr>
    </table>

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 0 0;text-align:center;">
    <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,.2);">
      LEADFRAME by SynAppsSys &middot; México
    </p>
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,.12);">
      Recibiste este correo porque escaneaste el QR de demostración de LeadFrame.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
