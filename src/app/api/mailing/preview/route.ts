import { buildAidrHtml } from "@/lib/campaigns/aidr";

function isAuthorized(request: Request): boolean {
  const key = process.env.RAFFLE_ADMIN_KEY;
  if (!key) return false;
  const headerKey = request.headers.get("x-admin-key");
  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key");
  return headerKey === key || queryKey === key;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("No autorizado.", { status: 401, headers: { "Content-Type": "text/plain" } });
  }

  const url = new URL(request.url);
  const campaign = url.searchParams.get("campaign") ?? "aidr";

  if (campaign !== "aidr") {
    return new Response("Campaña no encontrada.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  const html = buildAidrHtml("preview@synappssys.com");
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
