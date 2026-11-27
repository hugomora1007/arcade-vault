import type { ComponentType } from "react";
import AsteroidsCanvas from "@/components/games/asteroids-canvas";
import ArkanoidCanvas from "@/components/games/arkanoid-canvas";
import TetrisCanvas from "@/components/games/tetris-canvas";
import SnakeCanvas from "@/components/games/snake-canvas";
import type { SkinId } from "@/lib/games/skins";
export interface GameSnapshot {
  score: number;
  lives: number;
  level: number;
  phase: string;
}
export interface GameEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  end(): void;
  destroy(): void;
  /** Cambia el skin en caliente. Opcional: solo lo tienen los juegos con skins. */
  setSkin?(skin: SkinId): void;
}
export interface GameCanvasProps {
  onReady: (engine: GameEngine) => void;
  onChange: (snapshot: GameSnapshot) => void;
  onGameOver: (finalScore: number) => void;
  /** Skin activo; los canvas sin skins lo ignoran. */
  skin: SkinId;
}
/** Juegos con motor real, indexados por `game.id`. El resto usa la simulación. */
export const REAL_GAMES: Record<
  string,
  {
    Canvas: ComponentType<GameCanvasProps>;
    initialSnapshot: GameSnapshot;
    /** true si el juego tiene `lib/games/<slug>/skins.ts` (muestra el selector). */
    hasSkins?: boolean;
  }
> = {
  asteroides: {
    Canvas: AsteroidsCanvas,
    initialSnapshot: { score: 0, lives: 3, level: 1, phase: "playing" },
    hasSkins: true,
  },
  tetris: {
    Canvas: TetrisCanvas,
    initialSnapshot: { score: 0, lives: 1, level: 1, phase: "playing" },
    hasSkins: true,
  },
  arkanoid: {
    Canvas: ArkanoidCanvas,
    initialSnapshot: { score: 0, lives: 3, level: 1, phase: "playing" },
    hasSkins: true,
  },
  snake: {
    Canvas: SnakeCanvas,
    initialSnapshot: { score: 0, lives: 1, level: 1, phase: "playing" },
    hasSkins: true,
  },
};
