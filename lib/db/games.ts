import { cacheLife, cacheTag } from "next/cache";
import type { Category, CoverColor, Game } from "@/lib/games";
import type { ScoreRow } from "@/lib/scores";
import type { Database } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";
/**
 * Etiqueta de caché de todo lo que depende de la tabla `scores`
 * (ranking, `best` y `plays`). `saveScore` la invalida tras insertar.
 */
export const SCORES_CACHE_TAG = "scores";
type GameRow = Database["public"]["Tables"]["games"]["Row"];
type StatsRow = Database["public"]["Views"]["game_stats"]["Row"];
function toGame(row: GameRow, stats?: StatsRow | null): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    // Los CHECK de la BD garantizan estos valores.
    cat: row.cat as Category,
    cover: row.cover,
    color: row.color as CoverColor,
    // La vista marca las columnas como nullable; sin filas equivale a 0.
    best: stats?.best ?? 0,
    plays: stats?.plays ?? 0,
  };
}
/** "DD/MM/AAAA" en UTC, para que servidor y cliente coincidan. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}
/** Todos los juegos ordenados por `sort_order`, con `best` y `plays`. */
export async function getGames(): Promise<Game[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(SCORES_CACHE_TAG);
  const supabase = createPublicClient();
  const [games, stats] = await Promise.all([
    supabase.from("games").select("*").order("sort_order"),
    supabase.from("game_stats").select("*"),
  ]);
  if (games.error) throw new Error("No se pudo cargar el catálogo.");
  if (stats.error) throw new Error("No se pudieron cargar las estadísticas.");
  const statsById = new Map(stats.data.map((s) => [s.game_id, s]));
  return games.data.map((g) => toGame(g, statsById.get(g.id)));
}
/**
 * Params para `generateStaticParams` de `/juegos/[id]` y `/juegos/[id]/jugar`.
 *
 * Si el catálogo no se puede leer devuelve un id de relleno para que la ruta
 * siga respondiendo (con su estado de error) en lugar de un 500. Durante
 * `next build` sí relanza el error: un build con el catálogo caído no debe
 * publicarse. Con `cacheComponents` se exige al menos un param.
 */
export async function getStaticGameParams(): Promise<{ id: string }[]> {
  try {
    const games = await getGames();
    return games.map((g) => ({ id: g.id }));
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build") throw error;
    return [{ id: "sin-catalogo" }];
  }
}

/** Un juego por id, o `null` si no existe. */
export async function getGame(id: string): Promise<Game | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(SCORES_CACHE_TAG);
  const supabase = createPublicClient();
  const [game, stats] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).maybeSingle(),
    supabase.from("game_stats").select("*").eq("game_id", id).maybeSingle(),
  ]);
  if (game.error) throw new Error("No se pudo cargar el juego.");
  if (stats.error) throw new Error("No se pudieron cargar las estadísticas.");
  return game.data ? toGame(game.data, stats.data) : null;
}
/**
 * Top de puntuaciones de un juego: `score` descendente y, a igualdad,
 * `created_at` ascendente (gana quien llegó antes).
 */
export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(SCORES_CACHE_TAG);
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error("No se pudo cargar el ranking.");
  return data.map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}
