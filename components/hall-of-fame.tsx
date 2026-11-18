import Link from "next/link";
import type { Game } from "@/lib/games";
import type { ScoreRow } from "@/lib/scores";
interface HallOfFameProps {
  games: Game[];
  /** Id del juego seleccionado (pestaña activa). */
  selectedId: string;
  /** Top de puntuaciones del juego seleccionado. */
  rows: ScoreRow[];
  /** `true` si el catálogo o el ranking no se pudieron cargar. */
  error?: boolean;
}
/** Huecos `---` cuando hay menos de 3 puntuaciones. */
function PodiumSlot({
  row,
  place,
  tone,
}: {
  row: ScoreRow | undefined;
  place: "01" | "02" | "03";
  tone: "gold" | "silver" | "bronze";
}) {
  const isGold = tone === "gold";
  return (
    <div className={`podium-slot ${tone}${row ? "" : " empty"}`}>
      {isGold && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={isGold ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {place}
      </div>
      <div className="name">{row ? row.name : "---"}</div>
      <div className="score" style={isGold ? { fontSize: 20 } : undefined}>
        {row ? row.score.toLocaleString("es-ES") : "---"}
      </div>
      <div className="date">{row ? row.date : "---"}</div>
    </div>
  );
}
export default function HallOfFame({
  games,
  selectedId,
  rows,
  error = false,
}: HallOfFameProps) {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <nav className="hall-tabs" aria-label="Juegos">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/salon?juego=${g.id}`}
            className={"chip" + (selectedId === g.id ? " active" : "")}
            aria-current={selectedId === g.id ? "page" : undefined}
          >
            {g.title}
          </Link>
        ))}
      </nav>
      {error ? (
        <div className="hall-state error" role="alert">
          <div className="hs-title">NO SE PUDO CARGAR EL RANKING</div>
          <p className="hs-text">
            Algo falló al leer las puntuaciones. Recarga la página en unos
            minutos.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="hall-state" role="status">
          <div className="hs-title">SIN PUNTUACIONES TODAVÍA</div>
          <p className="hs-text">
            Nadie ha guardado una puntuación en este juego.
          </p>
        </div>
      ) : (
        <>
          <div className="podium">
            <PodiumSlot row={rows[1]} place="02" tone="silver" />
            <PodiumSlot row={rows[0]} place="01" tone="gold" />
            <PodiumSlot row={rows[2]} place="03" tone="bronze" />
          </div>
          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={`${selectedId}-${r.rank}`}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
