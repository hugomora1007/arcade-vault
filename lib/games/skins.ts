/** Contrato común de skins (temas visuales) para los juegos reales. */
export type SkinId = "clasico" | "neon" | "retro";
export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const DEFAULT_SKIN: SkinId = "clasico";
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};
const storageKey = (gameId: string): string => `arcade-vault:skin:${gameId}`;
export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && SKIN_IDS.includes(value as SkinId);
}
/** Lee el skin guardado del juego. Solo en cliente (efectos o handlers). */
export function loadSkin(gameId: string): SkinId {
  if (typeof window === "undefined") return DEFAULT_SKIN;
  try {
    const value = window.localStorage.getItem(storageKey(gameId));
    return isSkinId(value) ? value : DEFAULT_SKIN;
  } catch {
    // Modo privado o almacenamiento bloqueado.
    return DEFAULT_SKIN;
  }
}
/** Guarda el skin elegido para el juego. Solo en cliente. */
export function saveSkin(gameId: string, skin: SkinId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(gameId), skin);
  } catch {
    // Sin persistencia: el skin vale solo para esta sesión.
  }
}
