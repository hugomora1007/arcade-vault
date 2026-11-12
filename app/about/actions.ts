"use server";

import { Resend } from "resend";
import { validateContact, type ContactResult } from "@/lib/contact";

const GENERIC_ERROR =
  "No pudimos enviar tu mensaje. Inténtalo de nuevo en unos minutos.";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function sendContactMessage(
  _prev: ContactResult | null,
  formData: FormData,
): Promise<ContactResult> {
  const input = {
    name: field(formData, "name").trim(),
    email: field(formData, "email").trim(),
    message: field(formData, "message").trim(),
  };

  // Honeypot: un bot lo rellena. Se responde como éxito sin enviar nada.
  if (field(formData, "website").trim() !== "") {
    return { ok: true, name: input.name };
  }

  const invalid = validateContact(input);
  if (invalid) {
    return { ok: false, error: invalid };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error("[contact] Faltan variables de entorno de Resend.");
    return { ok: false, error: GENERIC_ERROR };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: input.email,
      subject: `[Arcade Vault] Mensaje de ${input.name}`,
      text: [
        `Nombre: ${input.name}`,
        `Correo: ${input.email}`,
        "",
        "Mensaje:",
        input.message,
      ].join("\n"),
    });

    if (error) {
      // Solo se registra en el servidor; nunca se devuelve al cliente.
      console.error("[contact] Resend devolvió un error:", error.name);
      return { ok: false, error: GENERIC_ERROR };
    }
  } catch {
    console.error("[contact] Fallo inesperado al enviar con Resend.");
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true, name: input.name };
}
