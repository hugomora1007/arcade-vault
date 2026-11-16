import { getSupabaseEnv } from "@/lib/supabase/env";
// Verifica desde el servidor que la URL y la publishable key de Supabase son
// válidas. Nunca devuelve la URL, la key ni el error crudo.
export async function GET(): Promise<Response> {
  try {
    const { url, publishableKey } = getSupabaseEnv();
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 200) {
      return Response.json({ ok: true });
    }
  } catch {
    // Variables ausentes, red caída o timeout: se responde 503 sin detalles.
  }
  return Response.json({ ok: false }, { status: 503 });
}
