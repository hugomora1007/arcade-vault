import type { Metadata } from "next";
import HighlightIcon, {
  type HighlightIconKind,
} from "@/components/about/highlight-icon";
import Reveal from "@/components/home/reveal";

export const metadata: Metadata = {
  title: "Acerca de · Arcade Vault",
  description:
    "Conoce la misión de Arcade Vault y escríbenos: una plataforma para jugar online y competir por la puntuación más alta.",
};

const HIGHLIGHTS: { icon: HighlightIconKind; text: string; color: string }[] = [
  { icon: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  {
    icon: "BROWSER",
    text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR",
    color: "cyan",
  },
  { icon: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

export default function AboutPage() {
  return (
    <div className="about fade-in">
      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra
          misión es preservar y celebrar los arcades que definieron una
          generación, haciéndolos accesibles para todos, en cualquier lugar y
          sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div
              key={h.icon}
              className={"highlight " + h.color}
              style={{ transitionDelay: i * 80 + "ms" }}
            >
              <HighlightIcon kind={h.icon} />
              <div className="hl-text pixel">{h.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <Reveal as="div" className="about-divider" aria-hidden>
        <div className="div-bar" />
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }} />
          ))}
        </div>
        <div className="div-bar" />
      </Reveal>

      {/* CONTACT: se añade en los pasos 5–7 */}
    </div>
  );
}
