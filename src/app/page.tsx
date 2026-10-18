import type { Metadata } from "next";
import Game from "@/components/Game";
import { roundTotal } from "@/lib/scoring";
import { readChallenge } from "@/lib/tokens";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Challenge links get their own preview card in WhatsApp: "Can you beat 742?"
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const vs = (await searchParams).vs;
  const ch = typeof vs === "string" ? readChallenge(vs) : null;
  if (!ch) return {};
  const total = roundTotal(ch.points);
  const title = `Can you beat ${total}/1000 on GeoKhel?`;
  return {
    title,
    openGraph: { title, description: "Same 5 Indian sports questions. Tap where each moment happened.", images: [`/og?score=${total}`] },
  };
}

export default function Page() {
  return <Game />;
}
