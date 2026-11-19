import { notFound } from "next/navigation";
import GamePlayer from "@/components/game-player";
import LoadError from "@/components/load-error";
import { getGame, getStaticGameParams } from "@/lib/db/games";
import type { Game } from "@/lib/games";

export async function generateStaticParams() {
  return getStaticGameParams();
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let game: Game | null = null;
  try {
    game = await getGame(id);
  } catch {
    return <LoadError />;
  }
  if (!game) notFound();

  return <GamePlayer game={{ id: game.id, title: game.title }} />;
}
