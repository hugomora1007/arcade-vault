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
