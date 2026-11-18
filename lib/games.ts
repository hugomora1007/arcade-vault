export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type CoverColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  /** Slug usado en la URL, p. ej. "bloque-buster" */
  id: string;
  title: string;
  /** Descripción corta (tarjeta) */
  short: string;
  /** Descripción larga (detalle) */
  long: string;
  cat: Category;
  /** Clase CSS de portada, p. ej. "cover-bricks" */
  cover: string;
  /** Color del botón JUGAR */
  color: CoverColor;
  /** Mejor puntuación global (derivado de `game_stats`) */
  best: number;
  /** Puntuaciones guardadas (derivado de `game_stats`) */
  plays: number;
}

export const CATS: ["TODOS", ...Category[]] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];
