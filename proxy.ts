import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
/**
 * Devuelve un 404 real para ids de juego que no existen.
 *
 * Con `cacheComponents` la primera petición a un id desconocido empieza a
 * transmitirse antes de que `notFound()` se ejecute y responde 200. Aquí se
 * comprueba antes de renderizar, cuando el código de estado aún se puede fijar.
 */
export async function proxy(request: NextRequest) {
  const id = request.nextUrl.pathname.split("/")[2] ?? "";
  // El slug solo admite [a-z0-9-] (CHECK de `games.id`): evita la consulta.
  let exists = /^[a-z0-9-]+$/.test(id);
  if (exists) {
    try {
      const { data, error } = await createPublicClient()
        .from("games")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      // Ante un fallo de Supabase no se bloquea: la página gestiona el error.
      exists = error ? true : data !== null;
    } catch {
      exists = true;
    }
  }
  if (exists) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_not-found", request.url), {
    status: 404,
  });
}
export const config = {
  matcher: ["/juegos/:id", "/juegos/:id/jugar"],
};
