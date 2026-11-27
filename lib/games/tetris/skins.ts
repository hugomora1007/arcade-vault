import type { SkinId } from "@/lib/games/skins";
/** Colores de las 7 piezas en el orden de índice 1–7: I, O, T, S, Z, J, L. */
export type PieceColors = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];
/** Todos los colores que dibuja Tetris. */
export interface TetrisPalette {
  /** Fondo de todo el canvas (tablero y panel). */
  bg: string;
  /** Líneas de la cuadrícula del tablero. */
  grid: string;
  /** Recuadro de la vista previa NEXT. */
  nextBg: string;
  /** Etiquetas del panel (NEXT, LÍNEAS). */
  text: string;
  /** Contador de líneas. */
  textAccent: string;
  /** Color de cada pieza (I, O, T, S, Z, J, L). */
  pieces: PieceColors;
  /** Franja de realce superior de cada celda ("transparent" = sin realce). */
  highlight: string;
  /** Borde interior de cada celda (null = sin borde). */
  cellBorder: string | null;
  /** Pieza fantasma: relleno translúcido o solo contorno. */
  ghostStyle: "fill" | "outline";
  /** Opacidad de la pieza fantasma. */
  ghostAlpha: number;
  /** `shadowBlur` en px de las celdas (0 = sin glow, máximo 20). */
  glow: number;
  /** Scanlines tenues dibujadas sobre el canvas. */
  scanlines: boolean;
  /** Color de las scanlines (solo si `scanlines`). */
  scanlineColor: string;
}
export const SKINS: Record<SkinId, TetrisPalette> = {
  // Colores originales del juego, sin cambios: todos cumplen las reglas de
  // modo oscuro (fondo L=0.011, pieza mínima T 4.37:1, texto 14.14:1).
  clasico: {
    bg: "#1a1a25",
    grid: "rgba(255, 255, 255, 0.06)",
    nextBg: "rgba(255, 255, 255, 0.04)",
    text: "#e8e8f0",
    textAccent: "#e8e8f0",
    pieces: [
      "#4dd0e1",
      "#ffd54f",
      "#ba68c8",
      "#81c784",
      "#e57373",
      "#90caf9",
      "#ffb74d",
    ],
    highlight: "rgba(255, 255, 255, 0.12)",
    cellBorder: null,
    ghostStyle: "fill",
    ghostAlpha: 0.2,
    glow: 0,
    scanlines: false,
    scanlineColor: "transparent",
  },
  // Tokens de la web (--bg, --cyan, --yellow, --green, --magenta, --gold) más
  // un violeta y un azul eléctricos para T y J.
  neon: {
    bg: "#0a0a0f",
    grid: "rgba(0, 245, 255, 0.07)",
    nextBg: "rgba(0, 245, 255, 0.05)",
    text: "#00f5ff",
    textAccent: "#f5ff00",
    pieces: [
      "#00f5ff",
      "#f5ff00",
      "#b14bff",
      "#00ff88",
      "#ff006e",
      "#3d7bff",
      "#ffcf3a",
    ],
    highlight: "rgba(255, 255, 255, 0.22)",
    cellBorder: null,
    ghostStyle: "outline",
    ghostAlpha: 0.55,
    glow: 10,
    scanlines: false,
    scanlineColor: "transparent",
  },
  // Monitor de fósforo ámbar: 7 brillos de una rampa ámbar (≥1.31:1 entre
  // cualquier par), celdas planas con borde interior y scanlines.
  retro: {
    bg: "#0c0700",
    grid: "rgba(255, 176, 0, 0.08)",
    nextBg: "rgba(255, 176, 0, 0.05)",
    text: "#ffc651",
    textAccent: "#ffe9b8",
    pieces: [
      "#ffe9b8",
      "#ffc651",
      "#a56800",
      "#d98f00",
      "#8e5600",
      "#be7b00",
      "#efa819",
    ],
    highlight: "transparent",
    cellBorder: "#0c0700",
    ghostStyle: "outline",
    ghostAlpha: 0.55,
    glow: 2,
    scanlines: true,
    scanlineColor: "rgba(0, 0, 0, 0.28)",
  },
};
