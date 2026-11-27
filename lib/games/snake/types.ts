import type { SkinId } from "@/lib/games/skins";
export type SnakePhase = "playing" | "won" | "gameover";
export interface SnakeSnapshot {
  score: number; // 10 por fruta
  lives: number; // siempre 1: una muerte termina la partida (como Tetris)
  level: number; // 1 + floor(frutas / 5): determina la velocidad
  phase: SnakePhase;
}
export interface SnakeCallbacks {
  /** Solo cuando cambia algún valor del snapshot. */
  onChange: (snapshot: SnakeSnapshot) => void;
  /** Una vez al terminar la partida (muerte, victoria o botón FIN). */
  onGameOver: (finalScore: number) => void;
}
export interface SnakeEngine {
  /** Crea la Image de frutas y arranca el bucle al cargar. */
  start(): void;
  pause(): void;
  resume(): void;
  /** score=0, level=1, serpiente inicial y vuelve a `playing`. */
  restart(): void;
  /** Botón FIN: dispara onGameOver con el score actual. */
  end(): void;
  /** Cambia el skin en caliente sin reiniciar la partida. */
  setSkin(skin: SkinId): void;
  /** Cancela el requestAnimationFrame y elimina los listeners. */
  destroy(): void;
}
export type Direction = "up" | "down" | "left" | "right";
export interface Cell {
  col: number;
  row: number;
}
/** Recorte de una fruta dentro de `fruits.png`. */
export interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}
