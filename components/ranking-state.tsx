/** Estado vacío o de error de un ranking (`/salon` y `/juegos/[id]`). */
export default function RankingState({ kind }: { kind: "empty" | "error" }) {
  if (kind === "error") {
    return (
      <div className="hall-state error" role="alert">
        <div className="hs-title">NO SE PUDO CARGAR EL RANKING</div>
        <p className="hs-text">
          Algo falló al leer las puntuaciones. Recarga la página en unos
          minutos.
        </p>
      </div>
    );
  }
  return (
    <div className="hall-state" role="status">
      <div className="hs-title">SIN PUNTUACIONES TODAVÍA</div>
      <p className="hs-text">Nadie ha guardado una puntuación en este juego.</p>
    </div>
  );
}
