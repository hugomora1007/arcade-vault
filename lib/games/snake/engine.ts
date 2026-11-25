import {
  COLS,
  FRUIT_NAMES,
  FRUITS_PER_LEVEL,
  FRUITS_URL,
  H,
  MAX_DT,
  POINTS_PER_FRUIT,
  ROWS,
  W,
  tickMs,
} from "./constants";
import {
  OPPOSITE,
  Snake,
  drawBoard,
  drawFruit,
  drawSnake,
  inBounds,
  sameCell,
} from "./entities";
import type { Fruit } from "./entities";
import type {
  Cell,
  Direction,
  SnakeCallbacks,
  SnakeEngine,
  SnakePhase,
  SnakeSnapshot,
} from "./types";
const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
/** Máximo de direcciones pendientes de ejecutar. */
const MAX_QUEUE = 2;
function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
export function createSnakeEngine(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
): SnakeEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  // ── Estado (todo dentro de la closure) ─────────────────────────────────────
  let snake = new Snake();
  let fruit: Fruit | null = null;
  let queue: Direction[] = [];
  let score = 0;
  let level = 1;
  let phase: SnakePhase = "playing";
  /** Espera la primera pulsación válida antes de moverse. */
  let waiting = true;
  /** Tiempo acumulado hacia el siguiente paso (ms). */
  let acc = 0;
  let img: HTMLImageElement | null = null;
  let loaded = false;
  let started = false;
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastSnapshot: SnakeSnapshot | null = null;
  // ── Emisión hacia React ────────────────────────────────────────────────────
  function emit(): void {
    const snap: SnakeSnapshot = { score, lives: 1, level, phase };
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
  function finishGame(next: "won" | "gameover"): void {
    if (phase !== "playing") return;
    phase = next;
    stopLoop();
    draw();
    emit();
    callbacks.onGameOver(score);
  }
  /** Elige una casilla libre al azar (índice sobre la lista de libres). */
  function spawnFruit(): boolean {
    const free: Cell[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = { col, row };
        if (!snake.occupies(cell)) free.push(cell);
      }
    }
    if (free.length === 0) {
      fruit = null;
      return false;
    }
    fruit = {
      cell: free[Math.floor(Math.random() * free.length)],
      sprite: FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)],
    };
    return true;
  }
  function initGame(): void {
    snake = new Snake();
    queue = [];
    score = 0;
    level = 1;
    phase = "playing";
    waiting = true;
    acc = 0;
    spawnFruit();
  }
  function enqueue(dir: Direction): void {
    if (queue.length >= MAX_QUEUE) return;
    const ref = queue.length > 0 ? queue[queue.length - 1] : snake.direction;
    if (dir === ref || dir === OPPOSITE[ref]) return;
    queue.push(dir);
    waiting = false;
  }
  function step(): void {
    const dir = queue.shift() ?? snake.direction;
    const next = snake.nextHead(dir);
    if (!inBounds(next)) {
      finishGame("gameover");
      return;
    }
    const eats = fruit !== null && sameCell(next, fruit.cell);
    // Sin comer, la cola se libera en este mismo paso.
    if (snake.occupies(next, !eats)) {
      finishGame("gameover");
      return;
    }
    snake.step(dir);
    if (!eats) return;
    snake.grow();
    score += POINTS_PER_FRUIT;
    level = 1 + Math.floor(score / POINTS_PER_FRUIT / FRUITS_PER_LEVEL);
    if (!spawnFruit()) finishGame("won");
  }
  function update(dt: number): void {
    if (waiting) return;
    acc += dt * 1000;
    while (acc >= tickMs(level)) {
      acc -= tickMs(level);
      step();
      if (phase !== "playing") return;
    }
  }
  // ── Dibujo (sin HUD ni overlays: los muestra la plataforma) ────────────────
  function draw(): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawBoard(ctx);
    if (img && loaded && fruit) drawFruit(ctx, img, fruit);
    drawSnake(ctx, snake);
  }
  // ── Input ──────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent): void {
    if (isFormField(e.target)) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const dir = KEY_TO_DIR[e.code];
    if (!dir) return;
    if (phase !== "playing") return;
    e.preventDefault();
    if (paused) return;
    enqueue(dir);
  }
  window.addEventListener("keydown", onKeyDown);
  // ── Bucle principal ────────────────────────────────────────────────────────
  function loop(ts: number): void {
    if (destroyed || paused || phase !== "playing") {
      rafId = null;
      return;
    }
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    if (phase === "playing") {
      draw();
      emit();
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }
  function startLoop(): void {
    if (destroyed || !loaded || paused || rafId !== null) return;
    if (phase !== "playing") return;
    // Reinicia la referencia de tiempo: el tiempo en pausa no cuenta en dt.
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
      if (destroyed || started) return;
      started = true;
      emit();
      draw();
      const image = new Image();
      img = image;
      image.onload = () => {
        if (destroyed) return;
        loaded = true;
        draw();
        startLoop();
      };
      image.onerror = () => {
        console.error("No se pudo cargar el spritesheet de frutas de Snake");
      };
      image.src = FRUITS_URL;
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
      finishGame("gameover");
    },
    destroy() {
      destroyed = true;
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      if (img) {
        img.onload = null;
        img.onerror = null;
        img = null;
      }
    },
  };
}
