import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_ORIGIN_X,
  BLOCK_ORIGIN_Y,
  BLOCK_W,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  PADDLE_H,
  PADDLE_W,
  PADDLE_Y,
  SPRITES,
  W,
} from "./constants";
import type { ArkanoidPalette } from "./skins";
import type { BlockColor, LevelDef, SpriteFrame } from "./types";
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Paddle = Rect;
export interface Ball extends Rect {
  vx: number;
  vy: number;
}
export interface Block extends Rect {
  color: BlockColor;
  alive: boolean;
}
export interface Explosion extends Rect {
  color: BlockColor;
  /** Milisegundos transcurridos desde la destrucción del bloque. */
  elapsed: number;
}
export function createPaddle(): Paddle {
  return { x: (W - PADDLE_W) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
}
export function createBall(paddle: Paddle, speed: number): Ball {
  return {
    x: paddle.x + (paddle.w - BALL_SIZE) / 2,
    y: paddle.y - BALL_SIZE,
    w: BALL_SIZE,
    h: BALL_SIZE,
    vx: BASE_BALL_VX * speed,
    vy: BASE_BALL_VY * speed,
  };
}
export function createBlocks(level: LevelDef): Block[] {
  return level.blocks.map((b) => ({
    x: BLOCK_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCK_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
}
export function createExplosion(block: Block): Explosion {
  return {
    x: block.x,
    y: block.y,
    w: block.w,
    h: block.h,
    color: block.color,
    elapsed: 0,
  };
}
/** Colisión AABB pelota-bloque (solapamiento estricto, como el original). */
export function collideAABB(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  frame: SpriteFrame,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.drawImage(img, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  name: "paddle" | "ball" | `block_${BlockColor}`,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const frame = name.startsWith("block_")
    ? SPRITES.blocks[name.slice(6) as BlockColor]
    : SPRITES[name as "paddle" | "ball"];
  drawFrame(ctx, img, frame, x, y, w, h);
}
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  block: Block,
): void {
  drawSprite(
    ctx,
    img,
    `block_${block.color}`,
    block.x,
    block.y,
    block.w,
    block.h,
  );
}
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  exp: Explosion,
): void {
  const frameIndex = Math.min(
    Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
    3,
  );
  drawFrame(
    ctx,
    img,
    EXPLOSION_FRAMES[exp.color][frameIndex],
    exp.x,
    exp.y,
    exp.w,
    exp.h,
  );
}
export function drawPaddle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  paddle: Paddle,
): void {
  drawSprite(ctx, img, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
}
export function drawBall(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  ball: Ball,
): void {
  drawSprite(ctx, img, "ball", ball.x, ball.y, ball.w, ball.h);
}
/** Fin de la banda de un ladrillo en el spritesheet: sprite + 4 frames de explosión. */
const BAND_END_X = 384;
function parseHex(color: string): [number, number, number] {
  let h = color.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
const perceived = (r: number, g: number, b: number): number =>
  (0.299 * r + 0.587 * g + 0.114 * b) / 255;
/**
 * Recolorea en `data` el área dada: el tono dominante del sprite `ref` pasa a
 * ser `tint`, las sombras se oscurecen en proporción y los brillos se mezclan
 * hacia `highlight`. El alfa no cambia.
 */
function tintRegion(
  data: Uint8ClampedArray,
  width: number,
  area: { x: number; y: number; w: number; h: number },
  ref: SpriteFrame,
  tint: string,
  highlight: string,
): void {
  // Tono de referencia: el color opaco no negro más frecuente del sprite.
  const counts = new Map<number, number>();
  for (let y = ref.sy; y < ref.sy + ref.sh; y++)
    for (let x = ref.sx; x < ref.sx + ref.sw; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;
      const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      if (key === 0) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  let refKey = 0;
  let best = 0;
  for (const [key, n] of counts)
    if (n > best) {
      best = n;
      refKey = key;
    }
  const refP = Math.max(
    perceived(refKey >> 16, (refKey >> 8) & 255, refKey & 255),
    0.01,
  );
  const [tr, tg, tb] = parseHex(tint);
  const [hr, hg, hb] = parseHex(highlight);
  for (let y = area.y; y < area.y + area.h; y++)
    for (let x = area.x; x < area.x + area.w; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;
      const f = perceived(data[i], data[i + 1], data[i + 2]) / refP;
      if (f <= 1) {
        data[i] = tr * f;
        data[i + 1] = tg * f;
        data[i + 2] = tb * f;
      } else {
        const t = Math.min(1, f - 1);
        data[i] = tr + (hr - tr) * t;
        data[i + 1] = tg + (hg - tg) * t;
        data[i + 2] = tb + (hb - tb) * t;
      }
    }
}
/**
 * Devuelve el spritesheet con los tintes del skin aplicados (canvas fuera de
 * pantalla). Si el skin no tiñe nada, devuelve la imagen original.
 */
export function buildSkinSheet(
  img: HTMLImageElement,
  palette: ArkanoidPalette,
): CanvasImageSource {
  const tinted = Object.entries(palette.blocks) as [BlockColor, string][];
  if (!palette.paddle && !palette.ball && tinted.length === 0) return img;
  const sheet = document.createElement("canvas");
  sheet.width = img.naturalWidth;
  sheet.height = img.naturalHeight;
  const sctx = sheet.getContext("2d", { willReadFrequently: true });
  if (!sctx) return img;
  sctx.drawImage(img, 0, 0);
  const image = sctx.getImageData(0, 0, sheet.width, sheet.height);
  const { data, width } = image;
  const frameArea = (f: SpriteFrame) => ({
    x: f.sx,
    y: f.sy,
    w: f.sw,
    h: f.sh,
  });
  const { paddle, ball } = SPRITES;
  if (palette.paddle)
    tintRegion(
      data,
      width,
      frameArea(paddle),
      paddle,
      palette.paddle,
      palette.highlight,
    );
  if (palette.ball)
    tintRegion(
      data,
      width,
      frameArea(ball),
      ball,
      palette.ball,
      palette.highlight,
    );
  for (const [color, tint] of tinted) {
    const frame = SPRITES.blocks[color];
    // Banda completa: el ladrillo y sus frames de explosión comparten fila.
    const band = {
      x: frame.sx,
      y: frame.sy,
      w: BAND_END_X - frame.sx,
      h: frame.sh,
    };
    tintRegion(data, width, band, frame, tint, palette.highlight);
  }
  sctx.putImageData(image, 0, 0);
  return sheet;
}
