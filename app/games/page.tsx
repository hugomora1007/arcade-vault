import Library from "@/components/library";
import { getGames } from "@/lib/db/games";

export default async function GamesPage() {
  const games = await getGames();
  return <Library games={games} />;
}
