/**
 * Lee y valida las variables de entorno públicas de Supabase.
 *
 * Next.js solo inyecta `NEXT_PUBLIC_*` en el bundle del navegador si se
 * accede con la forma estática `process.env.NOMBRE`, por eso no se usa
 * acceso dinámico (`process.env[nombre]`).
 */
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL. Defínela en .env.local (ver specs/.env.template).",
    );
  }
  if (!publishableKey) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Defínela en .env.local (ver specs/.env.template).",
    );
  }
  return { url, publishableKey };
}
