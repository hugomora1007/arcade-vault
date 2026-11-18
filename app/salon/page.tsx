import { Suspense } from "react";
import HallOfFame from "@/components/hall-of-fame";
import { getGames, getTopScores } from "@/lib/db/games";
import type { Game } from "@/lib/games";
import type { ScoreRow } from "@/lib/scores";
const SALON_LIMIT = 12;
export default function SalonPage(props: PageProps<"/salon">) {
  // `searchParams` es dato de la petición: se lee dentro de <Suspense>.
  return (
    <Suspense fallback={<SalonFallback />}>
      <SalonContent searchParams={props.searchParams} />
    </Suspense>
  );
}
async function SalonContent({
  searchParams,
}: Pick<PageProps<"/salon">, "searchParams">) {
  const { juego } = await searchParams;
  let games: Game[] = [];
  let rows: ScoreRow[] = [];
  let selectedId = "";
  let error = false;
  try {
    games = await getGames();
    // Sin `?juego=` o con un id desconocido se usa el primero por `sort_order`.
    const requested = typeof juego === "string" ? juego : undefined;
    selectedId =
      games.find((g) => g.id === requested)?.id ?? games[0]?.id ?? "";
    if (selectedId) rows = await getTopScores(selectedId, SALON_LIMIT);
  } catch {
    error = true;
    rows = [];
  }
  return (
    <HallOfFame
      games={games}
      selectedId={selectedId}
      rows={rows}
      error={error}
    />
  );
}
function SalonFallback() {
  return (
    <div className="av-hall">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
      </div>
      <div className="hall-state" role="status">
        <div className="hs-title">CARGANDO RANKING_</div>
      </div>
    </div>
  );
}
