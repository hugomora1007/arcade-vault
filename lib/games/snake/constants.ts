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
// Atlas trasladado de references/source-assets/snake-assets/sprites.js.
// Las coordenadas son las originales; los nombres se corrigieron para que
// coincidan con el dibujo real de cada recorte.
export const FRUIT_SPRITES: Record<string, SpriteFrame> = {
  apple: fruit(34, 110),
  banana: fruit(186, 150),
  pineapple: fruit(378, 110),
  grapes: fruit(540, 130),
  pumpkin: fruit(712, 130),
  garlic: fruit(894, 110),
  eggplant: fruit(1066, 110),
  strawberry: fruit(1228, 130),
  cherry: fruit(1400, 130),
  carrot: fruit(1582, 110),
  mushroom: fruit(1734, 150),
  broccoli: fruit(1906, 150),
  watermelon: fruit(2068, 170),
  pepper: fruit(2250, 140),
  kiwi: fruit(2432, 130),
  lemon: fruit(2604, 130),
  orange: fruit(2786, 110),
  peach: fruit(2948, 130),
  peanut: fruit(3110, 150),
  radish: fruit(3302, 110),
  tomato: fruit(3454, 150),
  fruitbowl: fruit(3637, 130),
};
export const FRUIT_NAMES: readonly string[] = Object.keys(FRUIT_SPRITES);
