import type { SkinId } from "@/lib/games/skins";
export type TetrisPhase = "playing" | "gameover";
export interface TetrisSnapshot {
  score: number;
  /** 1 mientras se juega (una sola vida); 0 al terminar la partida. */
  lives: number;
  /** floor(lines / 10) + 1 */
  level: number;
  phase: TetrisPhase;
}
export interface TetrisCallbacks {
  /** Solo cuando cambia algún valor del snapshot. */
  onChange: (snapshot: TetrisSnapshot) => void;
  /** Una vez al terminar la partida. */
  onGameOver: (finalScore: number) => void;
}
export interface TetrisEngine {
  start(): void;
  pause(): void;
  resume(): void;
  /** score=0, lines=0, level=1, tablero vacío y vuelve a `playing`. */
  restart(): void;
  /** Botón FIN: dispara onGameOver con el score actual. */
  end(): void;
  /** Cancela el requestAnimationFrame y elimina los listeners. */
  destroy(): void;
  /** Cambia la paleta en caliente, sin reiniciar la partida. */
  setSkin(skin: SkinId): void;
}
/** Matriz de una pieza: 0 = vacío, 1–7 = índice de color. */
export type Shape = number[][];
/** Tablero: ROWS filas × COLS columnas, 0 = vacío, 1–7 = color fijado. */
export type Board = number[][];
export interface Piece {
  /** Índice 1–7 (I, O, T, S, Z, J, L). */
  type: number;
  shape: Shape;
  x: number;
  y: number;
}
