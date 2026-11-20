import type { Shape } from "./types";
/** Tamaño lógico del canvas (4:3). */
export const W = 800;
export const H = 600;
/** Tablero: 10×20 celdas de 30 px (300×600). */
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
/** Disposición en el canvas (propuesta del spec, ajustable). */
export const BOARD_X = 150;
export const BOARD_Y = 0;
export const PANEL_X = 490;
export const NEXT_Y = 60;
export const NEXT_SIZE = 4 * BLOCK;
export const LINES_Y = 260;
export const BG_COLOR = "#1a1a25";
export const GRID_COLOR = "rgba(255, 255, 255, 0.06)";
export const TEXT_COLOR = "#e8e8f0";
/** Índice 1–7: I, O, T, S, Z, J, L. El índice 0 (vacío) no tiene color. */
export const COLORS: readonly (string | null)[] = [
  null,
  "#4dd0e1", // I
  "#ffd54f", // O
  "#ba68c8", // T
  "#81c784", // S
  "#e57373", // Z
  "#90caf9", // J
  "#ffb74d", // L
];
export const PIECES: readonly (Shape | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];
export const PIECE_COUNT = 7;
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
/** Desplazamientos horizontales probados al rotar, en este orden. */
export const WALL_KICKS = [0, -1, 1, -2, 2] as const;
export const LINES_PER_LEVEL = 10;
export const BASE_DROP_INTERVAL = 1000;
export const DROP_INTERVAL_STEP = 90;
export const MIN_DROP_INTERVAL = 100;
/** Límite del delta de tiempo por frame (segundos), como Asteroides. */
export const MAX_DT = 0.05;
export const GHOST_ALPHA = 0.2;
