"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavSection = "home" | "biblioteca" | "salon" | "about" | "auth";

function sectionOf(pathname: string): NavSection | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/games") || pathname.startsWith("/juegos")) return "biblioteca";
  if (pathname.startsWith("/salon")) return "salon";
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/auth")) return "auth";
  return null;
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const section = sectionOf(pathname);
  const cls = (name: NavSection) => (section === name ? "active" : undefined);
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={cls("home")}>
            Inicio
          </Link>
          <Link href="/games" className={cls("biblioteca")}>
            Biblioteca
          </Link>
          <Link href="/salon" className={cls("salon")}>
            Salón de la Fama
          </Link>
          <Link href="/about" className={cls("about")}>
            Acerca de
          </Link>
        </div>
        <div className="spacer" />
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>
        <Link href="/auth" className="btn auth-btn">
          Iniciar Sesión
        </Link>
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          aria-expanded={open}
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      />
      <aside
        className={"av-mobile-panel" + (open ? " open" : "")}
        inert={!open}
      >
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link href="/" className={cls("home")} onClick={close}>
          Inicio
        </Link>
        <Link href="/games" className={cls("biblioteca")} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={cls("salon")} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/about" className={cls("about")} onClick={close}>
          Acerca de
        </Link>
        <Link href="/auth" className={cls("auth")} onClick={close}>
          Iniciar Sesión
        </Link>
        <div style={{ flex: 1 }} />
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
