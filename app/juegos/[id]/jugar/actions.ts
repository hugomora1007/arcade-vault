"use server";
import { updateTag } from "next/cache";
import { SCORES_CACHE_TAG } from "@/lib/db/games";
import { createPublicClient } from "@/lib/supabase/public";
export type SaveScoreResult =
  { ok: true } | { ok: false; error: "INVALID" | "UNKNOWN_GAME" | "FAILED" };
const MAX_SCORE = 9_999_999;
const NAME_PATTERN = /^[A-Z0-9]{3}$/;
/**
 * Valida e inserta una puntuación anónima (3 iniciales).
 *
 * Un Server Function es accesible por POST directo, así que los argumentos
 * se validan en ejecución aunque TypeScript ya los tipe. Los CHECK de la BD
 * son la última barrera.
 */
export async function saveScore(
  gameId: string,
  playerName: string,
  score: number,
): Promise<SaveScoreResult> {
  if (typeof gameId !== "string" || typeof playerName !== "string") {
    return { ok: false, error: "INVALID" };
  }
  const name = playerName.trim().toUpperCase();
  if (!NAME_PATTERN.test(name)) return { ok: false, error: "INVALID" };
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) {
    return { ok: false, error: "INVALID" };
  }
  const supabase = createPublicClient();
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("id", gameId)
    .maybeSingle();
  if (gameError) return { ok: false, error: "FAILED" };
  if (!game) return { ok: false, error: "UNKNOWN_GAME" };
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: game.id, player_name: name, score });
  // No se expone el detalle del error de Supabase al cliente.
  if (error) return { ok: false, error: "FAILED" };
  // Ranking, `best` y `plays` dependen de `scores`.
  updateTag(SCORES_CACHE_TAG);
  return { ok: true };
}
