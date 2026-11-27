import type { SkinId } from "@/lib/games/skins";
export type ArkanoidPhase = "playing" | "won" | "gameover";
export interface ArkanoidSnapshot {
  score: number;
  /** Vidas restantes: 3 al empezar, 0 al perder la última. */
  lives: number;
  /** Nivel actual, 1..5. */
  level: number;
  phase: ArkanoidPhase;
}
export interface ArkanoidCallbacks {
  /** Solo cuando cambia algún valor del snapshot. */
  onChange: (snapshot: ArkanoidSnapshot) => void;
  /** Una vez al terminar la partida (derrota, victoria o botón FIN). */
  onGameOver: (finalScore: number) => void;
}
export interface ArkanoidEngine {
  /** Crea la Image del spritesheet y arranca el bucle al cargar. */
  start(): void;
  pause(): void;
  resume(): void;
  /** score=0, lives=3, level=1, paleta centrada y vuelve a `playing`. */
  restart(): void;
  /** Botón FIN: dispara onGameOver con el score actual. */
  end(): void;
  /** Cambia el skin en caliente sin tocar el estado de la partida. */
  setSkin(skin: SkinId): void;
  /** Cancela el requestAnimationFrame y elimina los listeners. */
  destroy(): void;
}
export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
/** Recorte del spritesheet. */
export interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
export interface LevelBlock {
  col: number;
  row: number;
  color: BlockColor;
}
export interface LevelDef {
  /** Multiplicador de la velocidad de la pelota. */
  speed: number;
  blocks: LevelBlock[];
}
