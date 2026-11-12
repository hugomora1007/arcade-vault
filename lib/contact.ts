export const CONTACT_LIMITS = {
  name: 80,
  email: 254,
  message: 2000,
} as const;

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

// Formato razonable: algo@dominio.tld, sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Devuelve `null` si es válido, o un mensaje de error en español. */
export function validateContact(input: ContactInput): string | null {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (!name || !email || !message) {
    return "Completa todos los campos.";
  }
  if (name.length > CONTACT_LIMITS.name) {
    return `El nombre no puede superar ${CONTACT_LIMITS.name} caracteres.`;
  }
  if (email.length > CONTACT_LIMITS.email || !EMAIL_RE.test(email)) {
    return "Introduce un correo electrónico válido.";
  }
  if (message.length > CONTACT_LIMITS.message) {
    return `El mensaje no puede superar ${CONTACT_LIMITS.message} caracteres.`;
  }
  return null;
}
