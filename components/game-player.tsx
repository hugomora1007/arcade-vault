"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AsteroidsCanvas from "@/components/games/asteroids-canvas";
import { saveScore } from "@/app/juegos/[id]/jugar/actions";
import type { Game } from "@/lib/games";
import type {
  AsteroidsEngine,
  AsteroidsSnapshot,
} from "@/lib/games/asteroids/types";

const INITIAL_LIVES = 3;
const POINTS_PER_LEVEL = 2500;
const REAL_ASTEROIDS_ID = "asteroides";
const INITIALS_PATTERN = /^[A-Z0-9]{3}$/;

const ERROR_MESSAGES = {
  INITIALS: "Escribe 3 letras o números, por ejemplo ABC.",
  NO_SCORE: "Necesitas al menos 1 punto para entrar en el ranking.",
  FAILED: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.",
} as const;

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
  // Solo "asteroides" persiste: iniciales propias (3 caracteres) y estado de guardado.
  const [initials, setInitials] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Evita un segundo envío en el mismo instante, antes de que `saving` se refleje.
  const savingRef = useRef(false);

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
    setSaving(false);
    setSaveError(null);
    savingRef.current = false;
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    if (!isReal) {
      // Simulación: solo feedback, no se persiste nada.
      setSaved(true);
      return;
    }

    const clean = initials.trim().toUpperCase();
    if (!INITIALS_PATTERN.test(clean)) {
      setSaveError(ERROR_MESSAGES.INITIALS);
      return;
    }
    if (score < 1) {
      setSaveError(ERROR_MESSAGES.NO_SCORE);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveScore(game.id, clean, score);
      if (result.ok) setSaved(true);
      else
        setSaveError(
          result.error === "INVALID"
            ? ERROR_MESSAGES.INITIALS
            : ERROR_MESSAGES.FAILED,
        );
    } catch {
      // Sin red u otro fallo del transporte: se puede reintentar.
      setSaveError(ERROR_MESSAGES.FAILED);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
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
              <>
                <div className="input-row">
                  <input
                    value={isReal ? initials : name}
                    onChange={(e) =>
                      isReal
                        ? setInitials(e.target.value.toUpperCase().slice(0, 3))
                        : setName(e.target.value.toUpperCase().slice(0, 10))
                    }
                    maxLength={isReal ? 3 : undefined}
                    placeholder="TUS INICIALES"
                    aria-label="Tus iniciales"
                    aria-invalid={saveError ? true : undefined}
                    aria-describedby={saveError ? "save-error" : undefined}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="btn yellow"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveError && (
                  <p id="save-error" className="save-error" role="alert">
                    {saveError}
                  </p>
                )}
              </>
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
