import type { Cell, Direction, SpriteFrame } from "./types";
export const W = 800;
export const H = 600;
export const CELL = 40;
export const COLS = 20;
export const ROWS = 15;
export const POINTS_PER_FRUIT = 10;
export const FRUITS_PER_LEVEL = 5;
export const MAX_DT = 0.05; // s (50 ms)
export const INITIAL_DIRECTION: Direction = "right";
/** Serpiente inicial: cabeza primero. */
export const INITIAL_SNAKE: readonly Cell[] = [
  { col: 5, row: 7 },
  { col: 4, row: 7 },
  { col: 3, row: 7 },
];
/** Intervalo entre pasos en ms: 140 en el nivel 1, 70 desde el nivel 8. */
export const tickMs = (level: number): number =>
  Math.max(70, 140 - (level - 1) * 10);
/** URL pública del spritesheet de frutas (carpeta `public/`). */
export const FRUITS_URL = "/games/snake/fruits.png";
/** Alto de la fruta al dibujarla (90 % de la casilla). */
export const FRUIT_DRAW_H = 36;
export const BOARD_COLORS = ["#aad751", "#a2d149"] as const;
export const SNAKE_COLOR = "#4674e9";
const fruit = (x: number, w: number): SpriteFrame => ({ x, y: 136, w, h: 160 });
// Atlas trasladado de references/source-assets/snake-assets/sprites.js
export const FRUIT_SPRITES: Record<string, SpriteFrame> = {
  banana: fruit(34, 110),
  orange: fruit(186, 150),
  grape: fruit(378, 110),
  garlic: fruit(540, 130),
  eggplant: fruit(712, 130),
  strawberry: fruit(894, 110),
  cherry: fruit(1066, 110),
  carrot: fruit(1228, 130),
  mushroom: fruit(1400, 130),
  broccoli: fruit(1582, 110),
  watermelon: fruit(1734, 150),
  pepper: fruit(1906, 150),
  kiwi: fruit(2068, 170),
  lemon: fruit(2250, 140),
  peach: fruit(2432, 130),
  peanut: fruit(2604, 130),
  apple: fruit(2786, 110),
  tomato: fruit(2948, 130),
  berries: fruit(3110, 150),
  grapes2: fruit(3302, 110),
  pineapple: fruit(3454, 150),
  melon: fruit(3637, 130),
};
export const FRUIT_NAMES: readonly string[] = Object.keys(FRUIT_SPRITES);
