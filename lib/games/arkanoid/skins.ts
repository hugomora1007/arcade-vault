import type { SkinId } from "@/lib/games/skins";
import type { BlockColor } from "./types";
/**
 * Todos los colores que dibuja Arkanoid. Las piezas son sprites: un tinte
 * recolorea su banda del spritesheet conservando el sombreado (el tono
 * dominante del sprite pasa a ser exactamente el color del tinte).
 * Sin tinte, el sprite se dibuja con sus colores originales.
 */
export interface ArkanoidPalette {
  /** Fondo del canvas. */
  background: string;
  /** Tinte de la paleta (pala) del jugador. */
  paddle?: string;
  /** Tinte de la pelota. */
  ball?: string;
  /** Tinte por color de ladrillo (también tiñe sus frames de explosión). */
  blocks: Partial<Record<BlockColor, string>>;
  /** Tono hacia el que se aclaran los brillos del sprite al teñirlo. */
  highlight: string;
  /** `shadowBlur` en px de pala y pelota (0 = sin glow, máximo 20). */
  glow: number;
  /** Color del glow de la pala. */
  paddleGlow: string;
  /** Color del glow de la pelota. */
  ballGlow: string;
  /** Scanlines tenues dibujadas sobre el canvas. */
  scanlines: boolean;
  /** Color de las scanlines (solo si `scanlines`). */
  scanlineColor: string;
}
export const SKINS: Record<SkinId, ArkanoidPalette> = {
  // Spritesheet original. Única corrección: el ladrillo gris (#323142,
  // 1.6:1 sobre negro) se aclara manteniendo su tono gris azulado.
  clasico: {
    background: "#000",
    blocks: { gray: "#6a6982" },
    highlight: "#c4c3d4",
    glow: 0,
    paddleGlow: "transparent",
    ballGlow: "transparent",
    scanlines: false,
    scanlineColor: "transparent",
  },
  // Tokens de la web (--bg, --cyan, --magenta, --yellow, --green, --gold,
  // --bronze, --ink, --ink-dim) con glow en pala y pelota.
  neon: {
    background: "#0a0a0f",
    paddle: "#00f5ff",
    ball: "#e6e9ff",
    blocks: {
      red: "#ff006e",
      yellow: "#f5ff00",
      cyan: "#00ff88",
      magenta: "#a86bff",
      hotpink: "#d97a3a",
      green: "#00f5ff",
      gray: "#8a8fb5",
    },
    highlight: "#e6e9ff",
    glow: 14,
    paddleGlow: "#00f5ff",
    ballGlow: "#ffcf3a",
    scanlines: false,
    scanlineColor: "transparent",
  },
  // Monitor de fósforo ámbar: 4 brillos para que los ladrillos vecinos se
  // distingan (≥1.3:1 entre filas contiguas de cualquier nivel).
  retro: {
    background: "#0c0700",
    paddle: "#ffc44d",
    ball: "#ffd98a",
    blocks: {
      red: "#a86a00",
      magenta: "#a86a00",
      gray: "#a86a00",
      cyan: "#c98200",
      green: "#c98200",
      hotpink: "#e89a00",
      yellow: "#ffd98a",
    },
    highlight: "#ffe6b0",
    glow: 2,
    paddleGlow: "#e89a00",
    ballGlow: "#e89a00",
    scanlines: true,
    scanlineColor: "rgba(0, 0, 0, 0.28)",
  },
};
