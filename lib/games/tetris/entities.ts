import {
  BG_COLOR,
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLORS,
  COLS,
  GHOST_ALPHA,
  GRID_COLOR,
  H,
  NEXT_SIZE,
  NEXT_Y,
  PANEL_X,
  PIECES,
  PIECE_COUNT,
  ROWS,
  W,
} from "./constants";
import type { Board, Piece, Shape } from "./types";
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}
/** Pieza aleatoria, uniforme sobre las 7 piezas estándar. */
export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_COUNT) + 1;
  const shape = (PIECES[type] as Shape).map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
export function collide(
  board: Board,
  shape: Shape,
  ox: number,
  oy: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
}
/** Fija la pieza en el tablero (muta `board`). */
export function merge(board: Board, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        board[piece.y + r][piece.x + c] = piece.shape[r][c];
      }
    }
  }
}
/** Fila donde aterrizaría la pieza actual. */
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
/**
 * Dibuja una celda. (gx, gy) son coordenadas de celda; (ox, oy) el origen en
 * píxeles de la cuadrícula dentro del canvas.
 */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  colorIndex: number,
  size: number,
  ox = 0,
  oy = 0,
  alpha = 1,
): void {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  if (!color) return;
  const px = ox + gx * size;
  const py = oy + gy * size;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  // realce
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(px + 1, py + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}
export function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);
}
export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= COLS; c++) {
    const x = BOARD_X + c * BLOCK + 0.5;
    ctx.moveTo(x, BOARD_Y);
    ctx.lineTo(x, BOARD_Y + ROWS * BLOCK);
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = BOARD_Y + r * BLOCK + 0.5;
    ctx.moveTo(BOARD_X, y);
    ctx.lineTo(BOARD_X + COLS * BLOCK, y);
  }
  ctx.stroke();
}
export function drawBoard(ctx: CanvasRenderingContext2D, board: Board): void {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawBlock(ctx, c, r, board[r][c], BLOCK, BOARD_X, BOARD_Y);
    }
  }
}
export function drawGhost(
  ctx: CanvasRenderingContext2D,
  board: Board,
  piece: Piece,
): void {
  const gy = ghostY(board, piece);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      drawBlock(
        ctx,
        piece.x + c,
        gy + r,
        piece.shape[r][c],
        BLOCK,
        BOARD_X,
        BOARD_Y,
        GHOST_ALPHA,
      );
    }
  }
}
export function drawPiece(ctx: CanvasRenderingContext2D, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      drawBlock(
        ctx,
        piece.x + c,
        piece.y + r,
        piece.shape[r][c],
        BLOCK,
        BOARD_X,
        BOARD_Y,
      );
    }
  }
}
/** Vista previa NEXT: la pieza centrada en una cuadrícula de 4×4 celdas. */
export function drawNext(ctx: CanvasRenderingContext2D, next: Piece): void {
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(PANEL_X, NEXT_Y, NEXT_SIZE, NEXT_SIZE);
  const { shape } = next;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      drawBlock(ctx, offX + c, offY + r, shape[r][c], BLOCK, PANEL_X, NEXT_Y);
    }
  }
}
