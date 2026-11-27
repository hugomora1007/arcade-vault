import type { SkinId } from "@/lib/games/skins";
/** Todos los colores que dibuja Snake. */
export interface SnakePalette {
  /** Casillas del tablero en damero: [par, impar]. */
  board: readonly [string, string];
  /** Cuerpo de la serpiente. */
  body: string;
  /** Cabeza de la serpiente. */
  head: string;
  /** Blanco de los ojos. */
  eyeWhite: string;
  /** Pupila. */
  eyePupil: string;
  /** Disco detrás de la fruta para que se lea sobre el tablero oscuro. */
  fruitHalo: string;
  /** Anillo del disco de la fruta. */
  fruitRing: string;
  /** `ctx.filter` aplicado al sprite de la fruta ("none" = sin cambios). */
  fruitFilter: string;
  /** `shadowBlur` en px de la serpiente y el anillo (0 = sin glow, máximo 20). */
  glow: number;
  /** Scanlines tenues dibujadas sobre el canvas. */
  scanlines: boolean;
  /** Color de las scanlines (solo si `scanlines`). */
  scanlineColor: string;
}
export const SKINS: Record<SkinId, SnakePalette> = {
  // Colores originales. Corrección de modo oscuro: el damero #aad751/#a2d149
  // se oscurece manteniendo el tono verde; ese verde claro pasa al disco de la
  // fruta para conservar la identidad del original.
  clasico: {
    board: ["#182509", "#1f2f0c"],
    body: "#4674e9",
    head: "#4674e9",
    eyeWhite: "#ffffff",
    eyePupil: "#000000",
    fruitHalo: "#aad751",
    fruitRing: "#aad751",
    fruitFilter: "none",
    glow: 0,
    scanlines: false,
    scanlineColor: "transparent",
  },
  // Tokens de la web (--bg, --green, --cyan, --magenta, --yellow).
  neon: {
    board: ["#0a0a0f", "#171722"],
    body: "#00ff88",
    head: "#00f5ff",
    eyeWhite: "#0a0a0f",
    eyePupil: "#f5ff00",
    fruitHalo: "rgba(255, 0, 110, 0.1)",
    fruitRing: "#ff006e",
    fruitFilter: "brightness(1.35) saturate(1.15)",
    glow: 12,
    scanlines: false,
    scanlineColor: "transparent",
  },
  // Monitor de fósforo ámbar: tonos por brillo, sin glow fuerte.
  retro: {
    board: ["#0c0700", "#201400"],
    body: "#e89a00",
    head: "#ffd98a",
    eyeWhite: "#0c0700",
    eyePupil: "#ffe6b0",
    fruitHalo: "#1f1400",
    fruitRing: "#ffc44d",
    fruitFilter:
      "grayscale(1) sepia(1) saturate(3) hue-rotate(-12deg) brightness(1.25)",
    glow: 2,
    scanlines: true,
    scanlineColor: "rgba(0, 0, 0, 0.28)",
  },
};
