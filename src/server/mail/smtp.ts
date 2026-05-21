import nodemailer, { type Transporter } from "nodemailer";

import type { MailMessage, MailTransport } from "./types";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export type SmtpMail = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

// Pure builder so the message shape is unit-testable without a live SMTP server.
export function buildSmtpMail(message: MailMessage): SmtpMail {
  const visibleEmail = requiredEnv("NACHKLANG_VISIBLE_EMAIL");
  return {
    from: `NachKlang Sicherheit <${visibleEmail}>`,
    to: message.to,
    subject: message.subject,
    html: message.html,
  };
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  const host = requiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return cachedTransporter;
}

export const smtpMailTransport: MailTransport = {
  async send(message: MailMessage): Promise<void> {
    try {
      await getTransporter().sendMail(buildSmtpMail(message));
    } catch (error) {
      // MAIL_SEND_FAILED — same opaque code as Graph; no message content logged.
      console.error("SMTP sendMail failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      throw new Error("MAIL_SEND_FAILED");
    }
  },
};
