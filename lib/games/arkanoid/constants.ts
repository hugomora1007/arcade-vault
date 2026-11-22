import type { BlockColor, SpriteFrame } from "./types";
export const W = 800;
export const H = 600;
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_SPEED = 400; // px/s
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCK_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
export const BLOCK_ORIGIN_Y = 80;
export const POINTS_PER_BLOCK = 10;
export const INITIAL_LIVES = 3;
export const MAX_DT = 0.05; // s (50 ms)
/** URL pública del spritesheet (carpeta `public/`). */
export const SPRITESHEET_URL = "/games/arkanoid/spritesheet-breakout.png";
export const EXPLOSION_DURATION = 150; // ms
const explosionRow = (sy: number): SpriteFrame[] =>
  [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));
export const EXPLOSION_FRAMES: Record<BlockColor, SpriteFrame[]> = {
  red: explosionRow(176),
  cyan: explosionRow(192),
  green: explosionRow(208),
  magenta: explosionRow(224),
  yellow: explosionRow(240),
  hotpink: explosionRow(256),
  gray: explosionRow(176), // reutiliza los frames de red
};
const blockSprite = (sy: number): SpriteFrame => ({
  sx: 32,
  sy,
  sw: 32,
  sh: 16,
});
export const SPRITES: {
  paddle: SpriteFrame;
  ball: SpriteFrame;
  blocks: Record<BlockColor, SpriteFrame>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: blockSprite(288),
    red: blockSprite(176),
    yellow: blockSprite(240),
    cyan: blockSprite(192),
    magenta: blockSprite(224),
    hotpink: blockSprite(256),
    green: blockSprite(208),
  },
};
