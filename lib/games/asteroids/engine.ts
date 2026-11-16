import {
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  dist,
  rand,
} from "./entities";
import type {
  AsteroidsCallbacks,
  AsteroidsEngine,
  AsteroidsPhase,
  AsteroidsSnapshot,
} from "./types";
/** Teclas cuyo comportamiento por defecto (scroll, activar botón) se bloquea. */
const BLOCKED_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);
function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  // ── Estado (todo dentro de la closure) ─────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: AsteroidsPhase = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;
  let lastSnapshot: AsteroidsSnapshot | null = null;
  // ── Input ──────────────────────────────────────────────────────────────────
  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};
  function pressed(code: string): boolean {
    const val = justPressed[code] === true;
    justPressed[code] = false;
    return val;
  }
  function clearInput(): void {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(justPressed)) justPressed[k] = false;
  }
  function onKeyDown(e: KeyboardEvent): void {
    if (isFormField(e.target)) return;
    if (state === "gameover") return;
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    if (paused) return;
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }
  function onKeyUp(e: KeyboardEvent): void {
    keys[e.code] = false;
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  // ── Emisión hacia React ────────────────────────────────────────────────────
  function emit(): void {
    const next: AsteroidsSnapshot = { score, lives, level, phase: state };
    const prev = lastSnapshot;
    if (
      prev &&
      prev.score === next.score &&
      prev.lives === next.lives &&
      prev.level === next.level &&
      prev.phase === next.phase
    ) {
      return;
    }
    lastSnapshot = next;
    callbacks.onChange(next);
  }
  // ── Lógica del juego ───────────────────────────────────────────────────────
  function spawnAsteroids(count: number): void {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame(): void {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    deadTimer = 0;
    spawnAsteroids(4);
  }
  function nextLevel(): void {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }
  function explode(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function killShip(): void {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
      clearInput();
      emit();
      callbacks.onGameOver(score);
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }
  function updateParticles(dt: number): void {
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }
  function update(dt: number): void {
    if (state === "gameover") {
      updateParticles(dt);
      return;
    }
    if (state === "dead") {
      deadTimer -= dt;
      updateParticles(dt);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }
    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }
    ship.input.left = !!keys["ArrowLeft"];
    ship.input.right = !!keys["ArrowRight"];
    ship.input.up = !!keys["ArrowUp"];
    ship.update(dt);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));
    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (state === "playing" && asteroids.length === 0) nextLevel();
  }
  // ── Dibujo (sin HUD: lo muestra la plataforma) ─────────────────────────────
  function draw(): void {
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);
  }
  // ── Bucle principal ────────────────────────────────────────────────────────
  function loop(ts: number): void {
    if (destroyed || paused) {
      rafId = null;
      return;
    }
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    emit();
    rafId = requestAnimationFrame(loop);
  }
  function startLoop(): void {
    if (destroyed || rafId !== null) return;
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
      clearInput();
      stopLoop();
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      clearInput();
      startLoop();
    },
    restart() {
      if (destroyed) return;
      stopLoop();
      initGame();
      paused = false;
      clearInput();
      draw();
      emit();
      startLoop();
    },
    end() {
      if (destroyed || state === "gameover") return;
      state = "gameover";
      clearInput();
      emit();
      callbacks.onGameOver(score);
    },
    destroy() {
      destroyed = true;
      stopLoop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
