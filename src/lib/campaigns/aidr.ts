export const AIDR_SUBJECT = "El 78% del Shadow AI en tu empresa ya está en los endpoints";
export const AIDR_PREHEADER = "ThreatDown AIDR: ve, clasifica y gobierna el uso de IA en tu organización desde hoy.";
export const AIDR_FROM = "ThreatDown Soluciones <contacto@synappssys.com>";
export const AIDR_REPLY_TO = "salvador.ruiz@synappssys.com";
export const AIDR_CAMPAIGN_KEY = "threatdown_aidr_2026";
export const AIDR_PDF = "ThreatDown AIDR.pdf";

const CALENDLY = "https://calendly.com/salvador-ruiz-synappssys";

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
}

function buildCalUrl(email: string): string {
  const base = siteBase();
  if (!base) return CALENDLY;
  const params = new URLSearchParams({ nombre: "", email, campaign: AIDR_CAMPAIGN_KEY });
  return `${base}/api/cal?${params}`;
}

export function buildAidrHtml(email: string = "preview@synappssys.com"): string {
  const ctaUrl = buildCalUrl(email);
  const base = siteBase();
  const logoSrc = `${base}/logos/ThreatDown_2.0_Stacked_Reverse.png`;
  const partnerLogoSrc = `${base}/logos/SynAppsSysLogoQ326.png`;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${AIDR_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#0A1228;font-family:Arial,Helvetica,sans-serif;color:#F5F7FA;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${AIDR_PREHEADER}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A1228;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#0D1B3E;border-radius:14px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.6);">

        <tr>
          <td style="padding:36px 36px 28px;text-align:center;background:linear-gradient(180deg,#0D2218 0%,#0D1B3E 100%);">
            <img src="${logoSrc}" alt="ThreatDown" style="display:block;margin:0 auto 20px;max-width:190px;width:100%;height:auto;" />
            <p style="margin:0 0 16px;text-align:center;">
              <span style="display:inline-block;background:#63D89A;color:#061A10;font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:6px 20px;border-radius:20px;">AIDR</span>
              &nbsp;
              <span style="display:inline-block;color:#B9C4D3;font-size:14px;font-weight:600;letter-spacing:.04em;padding:6px 0;vertical-align:middle;">Visibilidad y Gobierno de <span style="color:#63D89A;font-weight:700;">IA</span></span>
            </p>
            <h1 style="margin:0;font-size:28px;line-height:1.3;color:#F5F7FA;font-weight:700;">Del riesgo invisible al control inteligente</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 36px 0;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr valign="middle">
                <td width="55%" style="padding:0 14px 0 0;">
                  <p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#B9C4D3;">Hola,</p>
                  <p style="margin:0;font-size:15px;line-height:1.8;color:#B9C4D3;">Hoy muchas organizaciones usan inteligencia artificial sin tener visibilidad clara de <strong style="color:#F5F7FA;">qui&eacute;n</strong> la usa, <strong style="color:#F5F7FA;">qu&eacute; herramientas</strong> utilizan y <strong style="color:#F5F7FA;">con qu&eacute; frecuencia</strong>. Ese punto ciego es donde comienza el riesgo de <strong style="color:#F5F7FA;">Shadow <span style="color:#63D89A;">AI</span></strong>.</p>
                </td>
                <td width="45%" style="text-align:center;">
                  <img src="${base}/aidr-illustration.png" alt="Shadow AI" style="display:block;width:100%;max-width:230px;height:auto;border-radius:8px;margin:0 auto;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 36px 0;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="32%" style="padding:0 6px 0 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:10px;">
                    <tr><td style="padding:20px 10px;text-align:center;">
                      <p style="margin:0 0 4px;font-size:24px;line-height:1;">&#128100;</p>
                      <p style="margin:0;font-size:30px;font-weight:700;color:#63D89A;line-height:1;">&gt;80%</p>
                      <p style="margin:8px 0 0;font-size:11px;color:#B9C4D3;line-height:1.5;">de trabajadores de oficina usan IA en el trabajo</p>
                    </td></tr>
                  </table>
                </td>
                <td width="36%" style="padding:0 3px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:10px;">
                    <tr><td style="padding:20px 10px;text-align:center;">
                      <p style="margin:0 0 4px;font-size:24px;line-height:1;">&#128737;</p>
                      <p style="margin:0;font-size:30px;font-weight:700;color:#63D89A;line-height:1;">22%</p>
                      <p style="margin:8px 0 0;font-size:11px;color:#B9C4D3;line-height:1.5;">usa solo herramientas autorizadas</p>
                    </td></tr>
                  </table>
                </td>
                <td width="32%" style="padding:0 0 0 6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:10px;">
                    <tr><td style="padding:20px 10px;text-align:center;">
                      <p style="margin:0 0 4px;font-size:24px;line-height:1;">&#128181;</p>
                      <p style="margin:0;font-size:30px;font-weight:700;color:#63D89A;line-height:1;">$670K</p>
                      <p style="margin:8px 0 0;font-size:11px;color:#B9C4D3;line-height:1.5;">costo adicional por brecha con Shadow AI</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:8px 0 0;font-size:10px;color:#3A5070;">*Fuentes: IBM, Verizon DBIR 2026, Gartner.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 36px 0;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr valign="top">
                <td width="48%" style="padding:0 10px 0 0;">
                  <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#63D89A;text-transform:uppercase;letter-spacing:.08em;">AIDR te da visibilidad total</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:0 0 8px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:8px;">
                        <tr>
                          <td width="36" style="padding:12px 0 12px 12px;vertical-align:middle;font-size:20px;line-height:1;">&#128269;</td>
                          <td style="padding:12px 10px 12px 6px;"><p style="margin:0;font-size:12px;color:#F5F7FA;line-height:1.5;">Ve qu&eacute; herramientas de IA est&aacute;n activas hoy &mdash; sin suposiciones</p></td>
                        </tr>
                      </table>
                    </td></tr>
                    <tr><td style="padding:0 0 8px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:8px;">
                        <tr>
                          <td width="36" style="padding:12px 0 12px 12px;vertical-align:middle;font-size:20px;line-height:1;">&#128202;</td>
                          <td style="padding:12px 10px 12px 6px;"><p style="margin:0;font-size:12px;color:#F5F7FA;line-height:1.5;">Identifica qui&eacute;n la usa, cu&aacute;nto y qu&eacute; herramientas</p></td>
                        </tr>
                      </table>
                    </td></tr>
                    <tr><td>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#102044;border-radius:8px;">
                        <tr>
                          <td width="36" style="padding:12px 0 12px 12px;vertical-align:middle;font-size:20px;line-height:1;">&#9989;</td>
                          <td style="padding:12px 10px 12px 6px;"><p style="margin:0;font-size:12px;color:#F5F7FA;line-height:1.5;">Toma decisiones informadas sin agregar complejidad operativa</p></td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </td>
                <td width="52%" style="padding:0 0 0 10px;">
                  <img src="${base}/aidr-dashboard.png" alt="AIDR Dashboard" style="display:block;width:110%;max-width:110%;height:auto;border-radius:8px;margin-left:-5%;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 36px 0;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(90deg,#0D2A1A 0%,#122E1F 100%);border:1px solid #1E5C38;border-radius:10px;">
              <tr>
                <td width="48" style="padding:16px 0 16px 18px;vertical-align:middle;font-size:20px;color:#63D89A;">&#9989;</td>
                <td style="padding:16px 18px 16px 6px;">
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#B9C4D3;">
                    Disponible en todas las soluciones de ThreatDown &mdash;
                    <strong style="color:#63D89A;">sin costo adicional.</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 36px 10px;background:#0D1B3E;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="border-radius:8px;background:linear-gradient(90deg,#1A9150 0%,#27AE60 100%);box-shadow:0 8px 24px rgba(39,174,96,.3);">
                  <a href="${ctaUrl}" style="display:block;padding:17px 24px;font-size:16px;line-height:1.3;font-weight:700;color:#ffffff;text-decoration:none;">Programa una evaluaci&oacute;n gratuita de Shadow AI &nbsp;&#8250;</a>
                </td>
              </tr>
            </table>
            <p style="margin:10px 0 16px;text-align:center;font-size:11px;color:#3A5070;">Sin compromiso &nbsp;&#8226;&nbsp; 30 minutos &nbsp;&#8226;&nbsp; Valor desde el primer d&iacute;a</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="https://www.threatdown.com/products/ai-detection-and-response/" style="display:inline-block;text-decoration:none;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="background:#102044;border:1px solid #1E5C38;border-radius:8px;">
                      <tr valign="middle">
                        <td style="padding:10px 10px 10px 14px;">
                          <img src="${logoSrc}" alt="ThreatDown" style="display:block;width:90px;height:auto;" />
                        </td>
                        <td style="padding:10px 16px 10px 8px;border-left:1px solid #1B2D50;">
                          <p style="margin:0;font-size:13px;font-weight:700;color:#63D89A;white-space:nowrap;">Conoce ThreatDown AIDR &nbsp;&#8250;</p>
                          <p style="margin:2px 0 0;font-size:10px;color:#7A90B0;white-space:nowrap;">AI Detection &amp; Response</p>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 36px 28px;border-top:1px solid #1B2D50;background:#0D1B3E;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:0 0 18px;">
                <img src="${partnerLogoSrc}" alt="SynAppsSys" style="display:block;margin:0 auto;max-width:150px;width:100%;height:auto;" />
              </td></tr>
            </table>

            <!-- Firmantes: 2 columnas simétricas -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
              <tr valign="top">
                <td width="50%" style="padding:0 8px 0 0;text-align:center;border-right:1px solid #1B2D50;">
                  <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#F5F7FA;">Estela Cota</p>
                  <p style="margin:0 0 1px;font-size:10px;color:#7A90B0;">Territory Channel Account Manager</p>
                  <p style="margin:0 0 4px;font-size:10px;color:#7A90B0;">LATAM &nbsp;&middot;&nbsp; ThreatDown by Malwarebytes</p>
                  <a href="mailto:ecota@threatdown.com" style="font-size:10px;color:#63D89A;text-decoration:none;">ecota@threatdown.com</a>
                </td>
                <td width="50%" style="padding:0 0 0 8px;text-align:center;">
                  <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#F5F7FA;">Salvador Ruiz</p>
                  <p style="margin:0 0 1px;font-size:10px;color:#7A90B0;">Director General &nbsp;&middot;&nbsp; SynAppsSys</p>
                  <p style="margin:0 0 4px;font-size:10px;color:#7A90B0;">Platinum Partner ThreatDown</p>
                  <a href="mailto:salvador.ruiz@synappssys.com" style="font-size:10px;color:#63D89A;text-decoration:none;">salvador.ruiz@synappssys.com</a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:10px;color:#5A7090;text-align:center;line-height:1.6;">
              Recibiste este correo porque tuviste contacto con SynAppsSys o asististe a un evento de iSEC.<br/>
              Si no deseas recibir m&aacute;s comunicaciones, <a href="mailto:contacto@synappssys.com?subject=Baja%20de%20lista" style="color:#7A90B0;text-decoration:underline;">da clic aqu&iacute; para darte de baja</a>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
