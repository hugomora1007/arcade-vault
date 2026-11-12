import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acerca de · Arcade Vault",
  description:
    "Conoce la misión de Arcade Vault y escríbenos: una plataforma para jugar online y competir por la puntuación más alta.",
};

export default function AboutPage() {
  return (
    <div className="fade-in">
      <h1>ACERCA DE ARCADE VAULT</h1>
    </div>
  );
}
