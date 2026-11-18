import { notFound } from "next/navigation";
import GamePlayer from "@/components/game-player";
import { getGame, getGames } from "@/lib/db/games";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={{ id: game.id, title: game.title }} />;
}
