import type { SkinId } from "@/lib/games/skins";
/** Todos los colores que dibuja Asteroides. */
export interface AsteroidsPalette {
  /** Fondo del canvas. */
  background: string;
  /** Contorno de la nave. */
  ship: string;
  /** Llama del propulsor. */
  thrust: string;
  /** Balas. */
  bullet: string;
  /** Contorno de los asteroides. */
  asteroid: string;
  /** Rombo del power-up de triple disparo. */
  powerUp: string;
  /** Texto «3x» del power-up. */
  powerUpText: string;
  /** Canales «r, g, b» de las partículas; el alfa lo calcula cada partícula. */
  particleRgb: string;
  /** `shadowBlur` en px (0 = sin glow, máximo 20). */
  glow: number;
  /** Scanlines tenues dibujadas sobre el canvas. */
  scanlines: boolean;
  /** Color de las scanlines (solo si `scanlines`). */
  scanlineColor: string;
}
export const SKINS: Record<SkinId, AsteroidsPalette> = {
  // Colores originales del juego: ya cumplen las reglas de modo oscuro.
  clasico: {
    background: "#000",
    ship: "#fff",
    thrust: "rgba(255, 130, 0, 0.85)",
    bullet: "#fff",
    asteroid: "#fff",
    powerUp: "#0ff",
    powerUpText: "#0ff",
    particleRgb: "255, 255, 255",
    glow: 0,
    scanlines: false,
    scanlineColor: "transparent",
  },
  // Tokens de la web (--bg, --cyan, --magenta, --yellow, --green, --gold).
  neon: {
    background: "#0a0a0f",
    ship: "#00f5ff",
    thrust: "#ffcf3a",
    bullet: "#f5ff00",
    asteroid: "#ff006e",
    powerUp: "#00ff88",
    powerUpText: "#00ff88",
    particleRgb: "255, 0, 110",
    glow: 12,
    scanlines: false,
    scanlineColor: "transparent",
  },
  // Monitor de fósforo ámbar: tonos por brillo, sin glow fuerte.
  retro: {
    background: "#0c0700",
    ship: "#ffd98a",
    thrust: "#a86a00",
    bullet: "#ffe6b0",
    asteroid: "#e89a00",
    powerUp: "#ffc44d",
    powerUpText: "#ffc44d",
    particleRgb: "232, 154, 0",
    glow: 2,
    scanlines: true,
    scanlineColor: "rgba(0, 0, 0, 0.28)",
  },
};
