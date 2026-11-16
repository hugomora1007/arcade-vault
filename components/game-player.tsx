"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AsteroidsCanvas from "@/components/games/asteroids-canvas";
import type { Game } from "@/lib/games";
import type {
  AsteroidsEngine,
  AsteroidsSnapshot,
} from "@/lib/games/asteroids/types";

const INITIAL_LIVES = 3;
const POINTS_PER_LEVEL = 2500;
const REAL_ASTEROIDS_ID = "asteroides";

const INITIAL_SNAPSHOT: AsteroidsSnapshot = {
  score: 0,
  lives: INITIAL_LIVES,
  level: 1,
  phase: "playing",
};

export default function GamePlayer({ game }: { game: Pick<Game, "id" | "title"> }) {
  // Solo "asteroides" usa un motor real; el resto conserva la simulación.
  const isReal = game.id === REAL_ASTEROIDS_ID;
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const [snapshot, setSnapshot] = useState<AsteroidsSnapshot>(INITIAL_SNAPSHOT);

  const [fakeScore, setScore] = useState(0);
  const [fakeLives, setLives] = useState(INITIAL_LIVES);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [saved, setSaved] = useState(false);

  const score = isReal ? snapshot.score : fakeScore;
  const lives = isReal ? snapshot.lives : fakeLives;
  // En la simulación el nivel se deriva de la puntuación.
  const level = isReal
    ? snapshot.level
    : 1 + Math.floor(fakeScore / POINTS_PER_LEVEL);

  const handleReady = useCallback((engine: AsteroidsEngine) => {
    engineRef.current = engine;
  }, []);
  const handleGameOver = useCallback(() => {
    setPaused(false);
    setOver(true);
  }, []);

  // Temporizador falso: el azar vive solo aquí, dentro del efecto.
  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isReal, over, paused]);

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    if (isReal) {
      if (next) engineRef.current?.pause();
      else engineRef.current?.resume();
    }
  };

  const endGame = () => {
    if (isReal) engineRef.current?.end();
    else setOver(true);
  };

  const restart = () => {
    if (isReal) engineRef.current?.restart();
    setScore(0);
    setLives(INITIAL_LIVES);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            onClick={togglePause}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            type="button"
            className="btn magenta"
            onClick={endGame}
          >
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isReal ? (
            <AsteroidsCanvas
              onReady={handleReady}
              onChange={setSnapshot}
              onGameOver={handleGameOver}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor" />
              <div className="enemy e1" />
              <div className="enemy e2" />
              <div className="enemy e3" />
              <div className="player-ship" />
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal" role="dialog" aria-modal="true" aria-label="Fin del juego">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                />
                {/* Solo muestra el feedback: no se persiste nada. */}
                <button
                  type="button"
                  className="btn yellow"
                  onClick={() => setSaved(true)}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
