import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";
/**
 * Cliente de Supabase para lecturas públicas, sin cookies ni sesión.
 *
 * `"use cache"` y `generateStaticParams` no pueden leer `cookies()`, así que
 * `server.ts` no sirve ahí. Este cliente usa solo la publishable key y nunca
 * lee ni escribe cookies: las políticas RLS de lectura pública (`anon`) bastan.
 */
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
