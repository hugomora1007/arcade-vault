import type { ComponentType } from "react";
import AsteroidsCanvas from "@/components/games/asteroids-canvas";
import ArkanoidCanvas from "@/components/games/arkanoid-canvas";
import TetrisCanvas from "@/components/games/tetris-canvas";
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
}
export interface GameCanvasProps {
  onReady: (engine: GameEngine) => void;
  onChange: (snapshot: GameSnapshot) => void;
  onGameOver: (finalScore: number) => void;
}
/** Juegos con motor real, indexados por `game.id`. El resto usa la simulación. */
export const REAL_GAMES: Record<
  string,
  { Canvas: ComponentType<GameCanvasProps>; initialSnapshot: GameSnapshot }
> = {
  asteroides: {
    Canvas: AsteroidsCanvas,
    initialSnapshot: { score: 0, lives: 3, level: 1, phase: "playing" },
  },
  tetris: {
    Canvas: TetrisCanvas,
    initialSnapshot: { score: 0, lives: 1, level: 1, phase: "playing" },
  },
  arkanoid: {
    Canvas: ArkanoidCanvas,
    initialSnapshot: { score: 0, lives: 3, level: 1, phase: "playing" },
  },
};
