import {
  BASE_DROP_INTERVAL,
  DROP_INTERVAL_STEP,
  LINES_PER_LEVEL,
  LINES_Y,
  LINE_SCORES,
  MAX_DT,
  MIN_DROP_INTERVAL,
  NEXT_Y,
  PANEL_X,
  WALL_KICKS,
  COLS,
  ROWS,
} from "./constants";
import {
  collide,
  createBoard,
  drawBackground,
  drawBoard,
  drawGhost,
  drawGrid,
  drawNext,
  drawPiece,
  drawScanlines,
  ghostY,
  merge,
  randomPiece,
  rotateCW,
} from "./entities";
import { SKINS, type TetrisPalette } from "./skins";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
import type {
  Board,
  Piece,
  TetrisCallbacks,
  TetrisEngine,
  TetrisPhase,
  TetrisSnapshot,
} from "./types";
/** Teclas cuyo comportamiento por defecto (scroll, activar botón) se bloquea. */
const BLOCKED_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);
function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
function levelFor(lines: number): number {
  return Math.floor(lines / LINES_PER_LEVEL) + 1;
}
function dropIntervalFor(level: number): number {
  return Math.max(
    MIN_DROP_INTERVAL,
    BASE_DROP_INTERVAL - (level - 1) * DROP_INTERVAL_STEP,
  );
}
export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
  skin: SkinId = DEFAULT_SKIN,
): TetrisEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  // ── Estado (todo dentro de la closure) ─────────────────────────────────────
  let board: Board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let state: TetrisPhase = "playing";
  let dropAccum = 0; // ms
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;
  let lastSnapshot: TetrisSnapshot | null = null;
  let palette: TetrisPalette = SKINS[skin];
  // ── Emisión hacia React ────────────────────────────────────────────────────
  function emit(): void {
    const snap: TetrisSnapshot = {
      score,
      lives: state === "gameover" ? 0 : 1,
      level,
      phase: state,
    };
    const prev = lastSnapshot;
    if (
      prev &&
      prev.score === snap.score &&
      prev.lives === snap.lives &&
      prev.level === snap.level &&
      prev.phase === snap.phase
    ) {
      return;
    }
    lastSnapshot = snap;
    callbacks.onChange(snap);
  }
  // ── Lógica del juego ───────────────────────────────────────────────────────
  function finishGame(): void {
    if (state === "gameover") return;
    state = "gameover";
    stopLoop();
    draw();
    emit();
    callbacks.onGameOver(score);
  }
  function spawn(): void {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) {
      finishGame();
    }
  }
  function clearLines(): void {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      lines += cleared;
      // El multiplicador es el nivel vigente antes de recalcularlo.
      score += (LINE_SCORES[cleared] ?? 0) * level;
      level = levelFor(lines);
    }
  }
  function lockPiece(): void {
    merge(board, current);
    clearLines();
    spawn();
  }
  function tryRotate(): void {
    const rotated = rotateCW(current.shape);
    for (const kick of WALL_KICKS) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }
  function softDrop(): void {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }
  function hardDrop(): void {
    const gy = ghostY(board, current);
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }
  function initGame(): void {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    state = "playing";
    dropAccum = 0;
    next = randomPiece();
    spawn();
  }
  // ── Input ──────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent): void {
    if (isFormField(e.target)) return;
    if (state !== "playing") return;
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    if (paused) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(board, current.shape, current.x - 1, current.y)) {
          current.x--;
        }
        break;
      case "ArrowRight":
        if (!collide(board, current.shape, current.x + 1, current.y)) {
          current.x++;
        }
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
      default:
        return;
    }
    if (state === "playing") draw();
    emit();
  }
  window.addEventListener("keydown", onKeyDown);
  // ── Dibujo (sin HUD de plataforma: solo tablero y panel NEXT/LÍNEAS) ───────
  function drawPanel(): void {
    if (!ctx) return;
    ctx.fillStyle = palette.text;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 18px monospace";
    ctx.fillText("NEXT", PANEL_X, NEXT_Y - 14);
    ctx.fillText("LÍNEAS", PANEL_X, LINES_Y);
    ctx.font = "bold 36px monospace";
    ctx.fillStyle = palette.textAccent;
    ctx.fillText(String(lines), PANEL_X, LINES_Y + 44);
  }
  function draw(): void {
    if (!ctx) return;
    drawBackground(ctx, palette);
    drawGrid(ctx, palette);
    drawBoard(ctx, board, palette);
    drawGhost(ctx, board, current, palette);
    drawPiece(ctx, current, palette);
    drawNext(ctx, next, palette);
    drawPanel();
    drawScanlines(ctx, palette);
  }
  // ── Bucle principal ────────────────────────────────────────────────────────
  function loop(ts: number): void {
    if (destroyed || paused || state !== "playing") {
      rafId = null;
      return;
    }
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    dropAccum += dt * 1000;
    if (dropAccum >= dropIntervalFor(level)) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
    if (state === "playing") {
      draw();
      emit();
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }
  function startLoop(): void {
    if (destroyed || rafId !== null || state !== "playing") return;
    // Reinicia la referencia de tiempo: tras pausar, la pieza no cae de golpe.
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }
  function stopLoop(): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }
  // ── API pública ────────────────────────────────────────────────────────────
  initGame();
  return {
    start() {
      if (destroyed) return;
      paused = false;
      draw();
      emit();
      startLoop();
    },
    pause() {
      if (destroyed || paused) return;
      paused = true;
      stopLoop();
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      startLoop();
    },
    restart() {
      if (destroyed) return;
      stopLoop();
      initGame();
      paused = false;
      draw();
      emit();
      startLoop();
    },
    end() {
      if (destroyed) return;
      finishGame();
    },
    setSkin(nextSkin) {
      // Solo cambia la paleta: el estado de la partida no se toca.
      palette = SKINS[nextSkin];
      if (!destroyed) draw();
    },
    destroy() {
      destroyed = true;
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
