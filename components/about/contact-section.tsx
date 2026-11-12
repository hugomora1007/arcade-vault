"use client";

import { useActionState, useState } from "react";
import type { FormEvent } from "react";
import { sendContactMessage } from "@/app/about/actions";
import type { ContactResult } from "@/lib/contact";

const EMPTY = { name: "", email: "", message: "" };

export default function ContactSection() {
  const [result, formAction, pending] = useActionState<
    ContactResult | null,
    FormData
  >(sendContactMessage, null);
  const [form, setForm] = useState(EMPTY);
  const [shake, setShake] = useState(false);
  // Resultado de éxito ya cerrado con «ENVIAR OTRO MENSAJE».
  const [dismissed, setDismissed] = useState<ContactResult | null>(null);

  const sent = result?.ok && result !== dismissed ? result.name : null;
  const error = result && !result.ok ? result.error : null;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      e.preventDefault();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const reset = () => {
    setDismissed(result);
    setForm(EMPTY);
  };

  return (
    <div className="contact-grid">
      <div className="contact-intro">
        <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
        <h2 className="contact-title">CONTÁCTANOS</h2>
        <p className="contact-sub">
          ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente
          quieres saludar? Escríbenos.
        </p>
        <div className="contact-tips">
          <div className="tip">
            <span className="tip-led" />
            RESPUESTA EN 24-48H
          </div>
          <div className="tip">
            <span className="tip-led y" />
            SUGERENCIAS BIENVENIDAS
          </div>
          <div className="tip">
            <span className="tip-led m" />
            SIN SPAM, JAMÁS
          </div>
        </div>
      </div>

      <form
        className={"contact-form" + (shake ? " shake" : "")}
        action={formAction}
        onSubmit={onSubmit}
        noValidate
      >
        {!sent ? (
          <>
            <div className="field">
              <label htmlFor="contact-name">NOMBRE</label>
              <input
                id="contact-name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="px_kai"
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jugador@vault.gg"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="contact-message">MENSAJE</label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Cuéntanos qué tienes en mente…"
              />
            </div>

            {/* Honeypot: invisible para personas, los bots lo rellenan. */}
            <div
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px" }}
            >
              <input
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </div>

            {error && (
              <div className="contact-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="btn xl press"
              type="submit"
              style={{ width: "100%" }}
              disabled={pending}
            >
              {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
            </button>
          </>
        ) : (
          <div className="terminal-success">
            <div className="term-bar">
              <span className="dot r" />
              <span className="dot y" />
              <span className="dot g" />
              <span className="term-title">VAULT-OS // TERMINAL</span>
            </div>
            <div className="term-body">
              <div className="line">
                <span className="prompt">vault@arcade:~$</span> ./send_message
                --to=team
              </div>
              <div className="line dim">[OK] Conectando con servidor…</div>
              <div className="line dim">[OK] Validando contenido…</div>
              <div className="line dim">[OK] Transmitiendo paquete…</div>
              <div className="line success">
                &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
                {sent.toUpperCase()}.<span className="caret">_</span>
              </div>
              <div style={{ marginTop: 18 }}>
                <button className="btn ghost" type="button" onClick={reset}>
                  ENVIAR OTRO MENSAJE
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
