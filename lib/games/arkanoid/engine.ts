import {
  EXPLOSION_DURATION,
  H,
  INITIAL_LIVES,
  MAX_DT,
  PADDLE_SPEED,
  POINTS_PER_BLOCK,
  SPRITESHEET_URL,
  W,
} from "./constants";
import {
  buildSkinSheet,
  collideAABB,
  createBall,
  createBlocks,
  createExplosion,
  createPaddle,
  drawBall,
  drawBlock,
  drawExplosion,
  drawPaddle,
} from "./entities";
import type { Ball, Block, Explosion, Paddle } from "./entities";
import { LEVELS } from "./levels";
import { SKINS, type ArkanoidPalette } from "./skins";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
import type {
  ArkanoidCallbacks,
  ArkanoidEngine,
  ArkanoidPhase,
  ArkanoidSnapshot,
} from "./types";
/** Teclas cuyo comportamiento por defecto (scroll) se bloquea. */
const BLOCKED_KEYS = new Set(["ArrowLeft", "ArrowRight"]);
function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
  skin: SkinId = DEFAULT_SKIN,
): ArkanoidEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  // ── Estado (todo dentro de la closure) ─────────────────────────────────────
  let paddle: Paddle = createPaddle();
  let ball: Ball = createBall(paddle, LEVELS[0].speed);
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let phase: ArkanoidPhase = "playing";
  const keys = { left: false, right: false };
  let img: HTMLImageElement | null = null;
  let palette: ArkanoidPalette = SKINS[skin];
  // Spritesheet teñido por skin (se genera una vez por skin y se reutiliza).
  const sheets = new Map<ArkanoidPalette, CanvasImageSource>();
  let sheet: CanvasImageSource | null = null;
  let loaded = false;
  let started = false;
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastSnapshot: ArkanoidSnapshot | null = null;
  // ── Emisión hacia React ────────────────────────────────────────────────────
  function emit(): void {
    const snap: ArkanoidSnapshot = { score, lives, level, phase };
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
  function clearKeys(): void {
    keys.left = false;
    keys.right = false;
  }
  function finishGame(next: "won" | "gameover"): void {
    if (phase !== "playing") return;
    phase = next;
    clearKeys();
    stopLoop();
    draw();
    emit();
    callbacks.onGameOver(score);
  }
  function initBall(): void {
    ball = createBall(paddle, LEVELS[level - 1].speed);
  }
  function loadLevel(n: number): void {
    level = n;
    blocks = createBlocks(LEVELS[n - 1]);
    explosions = [];
    initBall();
  }
  function initGame(): void {
    score = 0;
    lives = INITIAL_LIVES;
    phase = "playing";
    paddle = createPaddle();
    clearKeys();
    loadLevel(1);
  }
  function update(dt: number): void {
    // Paleta
    if (keys.left) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.right) {
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
    }
    // Movimiento de la pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Rebotes en paredes (izquierda, derecha, techo)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }
    // Rebote en la paleta
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }
    // Colisión con bloques (uno por frame)
    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(ball, block)) {
        block.alive = false;
        explosions.push(createExplosion(block));
        score += POINTS_PER_BLOCK;
        ball.vy = -ball.vy;
        if (blocks.every((b) => !b.alive)) {
          if (level < LEVELS.length) {
            loadLevel(level + 1);
          } else {
            finishGame("won");
            return;
          }
        }
        break;
      }
    }
    // Explosiones
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);
    // Pelota perdida
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        finishGame("gameover");
      } else {
        initBall();
      }
    }
  }
  // ── Dibujo (sin HUD ni overlays: los muestra la plataforma) ────────────────
  function draw(): void {
    if (!ctx) return;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);
    if (!sheet || !loaded) return;
    for (const block of blocks) {
      if (block.alive) drawBlock(ctx, sheet, block);
    }
    for (const exp of explosions) drawExplosion(ctx, sheet, exp);
    ctx.save();
    ctx.shadowBlur = palette.glow;
    ctx.shadowColor = palette.paddleGlow;
    drawPaddle(ctx, sheet, paddle);
    ctx.shadowColor = palette.ballGlow;
    drawBall(ctx, sheet, ball);
    ctx.restore();
    if (palette.scanlines) drawScanlines(ctx);
  }
  /** Scanlines tenues de monitor CRT (skin retro). */
  function drawScanlines(c: CanvasRenderingContext2D): void {
    c.save();
    c.fillStyle = palette.scanlineColor;
    for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
    c.restore();
  }
  /** Prepara (o recupera de la caché) el spritesheet del skin activo. */
  function applySheet(): void {
    if (!img || !loaded) return;
    let next = sheets.get(palette);
    if (!next) {
      next = buildSkinSheet(img, palette);
      sheets.set(palette, next);
    }
    sheet = next;
  }
  // ── Input ──────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent): void {
    if (isFormField(e.target)) return;
    if (phase !== "playing") return;
    if (!BLOCKED_KEYS.has(e.key)) return;
    e.preventDefault();
    if (paused) return;
    if (e.key === "ArrowLeft") keys.left = true;
    else keys.right = true;
  }
  function onKeyUp(e: KeyboardEvent): void {
    if (e.key === "ArrowLeft") keys.left = false;
    else if (e.key === "ArrowRight") keys.right = false;
  }
  function onBlur(): void {
    clearKeys();
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
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
      const image = new Image();
      img = image;
      image.onload = () => {
        if (destroyed) return;
        loaded = true;
        applySheet();
        draw();
        startLoop();
      };
      image.onerror = () => {
        console.error("No se pudo cargar el spritesheet de Arkanoid");
      };
      image.src = SPRITESHEET_URL;
    },
    pause() {
      if (destroyed || paused) return;
      paused = true;
      clearKeys();
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
    setSkin(next) {
      // Solo cambia la paleta: el estado de la partida no se toca.
      palette = SKINS[next];
      applySheet();
      if (!destroyed) draw();
    },
    destroy() {
      destroyed = true;
      sheets.clear();
      sheet = null;
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (img) {
        img.onload = null;
        img.onerror = null;
        img = null;
      }
    },
  };
}
