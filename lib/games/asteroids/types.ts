export type AsteroidsPhase = "playing" | "dead" | "gameover";

export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  phase: AsteroidsPhase;
}

export interface AsteroidsCallbacks {
  /** Se llama solo cuando cambia score, lives, level o phase. */
  onChange: (snapshot: AsteroidsSnapshot) => void;
  /** Se llama una vez cuando lives llega a 0. */
  onGameOver: (finalScore: number) => void;
}

export interface AsteroidsEngine {
  start(): void;
  pause(): void;
  resume(): void;
  /** Reinicia score=0, lives=3, level=1 y vuelve a `playing`. */
  restart(): void;
  /** Termina la partida en curso (botón FIN): dispara onGameOver con el score actual. */
  end(): void;
  /** Cancela el requestAnimationFrame y elimina los listeners. */
  destroy(): void;
}
