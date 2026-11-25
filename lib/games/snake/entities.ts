import {
  BOARD_COLORS,
  CELL,
  COLS,
  FRUIT_DRAW_H,
  FRUIT_SPRITES,
  INITIAL_DIRECTION,
  INITIAL_SNAKE,
  ROWS,
  SNAKE_COLOR,
} from "./constants";
import type { Cell, Direction } from "./types";
export const DIR_VECTORS: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
export const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
export const sameCell = (a: Cell, b: Cell): boolean =>
  a.col === b.col && a.row === b.row;
export const inBounds = (c: Cell): boolean =>
  c.col >= 0 && c.col < COLS && c.row >= 0 && c.row < ROWS;
export class Snake {
  /** Segmentos con la cabeza primero. */
  segments: Cell[];
  direction: Direction;
  /** Última casilla liberada por la cola en `step`; `grow` la recupera. */
  private lastTail: Cell | null = null;
  constructor() {
    this.segments = INITIAL_SNAKE.map((c) => ({ ...c }));
    this.direction = INITIAL_DIRECTION;
  }
  get head(): Cell {
    return this.segments[0];
  }
  /** Casilla que ocuparía la cabeza al avanzar en `dir`. */
  nextHead(dir: Direction): Cell {
    const v = DIR_VECTORS[dir];
    return { col: this.head.col + v.col, row: this.head.row + v.row };
  }
  /** `ignoreTail`: no cuenta la última casilla (la cola se libera en el mismo paso). */
  occupies(cell: Cell, ignoreTail = false): boolean {
    const end = ignoreTail ? this.segments.length - 1 : this.segments.length;
    for (let i = 0; i < end; i++) {
      if (sameCell(this.segments[i], cell)) return true;
    }
    return false;
  }
  /** Avanza una casilla en `dir`: añade la cabeza y quita la cola. */
  step(dir: Direction): void {
    this.direction = dir;
    this.segments.unshift(this.nextHead(dir));
    this.lastTail = this.segments.pop() ?? null;
  }
  /** Crece una casilla: devuelve la cola que `step` acaba de quitar. */
  grow(): void {
    if (this.lastTail) {
      this.segments.push(this.lastTail);
      this.lastTail = null;
    }
  }
}
export interface Fruit {
  cell: Cell;
  /** Clave de `FRUIT_SPRITES`. */
  sprite: string;
}
export function drawBoard(ctx: CanvasRenderingContext2D): void {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillStyle = BOARD_COLORS[(col + row) % 2];
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    }
  }
}
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  fruit: Fruit,
): void {
  const s = FRUIT_SPRITES[fruit.sprite];
  if (!s) return;
  const dh = FRUIT_DRAW_H;
  const dw = (s.w / s.h) * dh;
  const dx = fruit.cell.col * CELL + (CELL - dw) / 2;
  const dy = fruit.cell.row * CELL + (CELL - dh) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, s.x, s.y, s.w, s.h, dx, dy, dw, dh);
}
export function drawSnake(ctx: CanvasRenderingContext2D, snake: Snake): void {
  const inset = 3;
  const size = CELL - inset * 2;
  ctx.fillStyle = SNAKE_COLOR;
  for (let i = 0; i < snake.segments.length; i++) {
    const seg = snake.segments[i];
    const x = seg.col * CELL + inset;
    const y = seg.row * CELL + inset;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 10);
    ctx.fill();
    // Conector con el segmento anterior para que el cuerpo sea continuo.
    if (i > 0) {
      const prev = snake.segments[i - 1];
      const px = prev.col * CELL + inset;
      const py = prev.row * CELL + inset;
      ctx.fillRect(
        Math.min(x, px) + (prev.col === seg.col ? 0 : size / 2),
        Math.min(y, py) + (prev.row === seg.row ? 0 : size / 2),
        prev.col === seg.col ? size : Math.abs(px - x),
        prev.row === seg.row ? size : Math.abs(py - y),
      );
    }
  }
  drawEyes(ctx, snake);
}
function drawEyes(ctx: CanvasRenderingContext2D, snake: Snake): void {
  const v = DIR_VECTORS[snake.direction];
  const cx = snake.head.col * CELL + CELL / 2;
  const cy = snake.head.row * CELL + CELL / 2;
  // Perpendicular a la dirección de avance.
  const px = -v.row;
  const py = v.col;
  for (const side of [-1, 1]) {
    const ex = cx + v.col * 6 + px * side * 8;
    const ey = cy + v.row * 6 + py * side * 8;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex, ey, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(ex + v.col * 2, ey + v.row * 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
