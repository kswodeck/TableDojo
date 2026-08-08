import nodemailer, { type Transporter } from 'nodemailer';
import { env, isProduction } from '../config/env.js';

/**
 * Mail transport.
 *
 * With SMTP_URL unset the API logs the message instead of sending it, so the
 * password-reset and contact flows are fully testable locally without wiring
 * up a mail provider. The original site called a third-party SMTP library from
 * the browser with the credentials embedded in the page source.
 */
let transporter: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!env.SMTP_URL) return null;
  transporter ??= nodemailer.createTransport(env.SMTP_URL);
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const transport = getTransport();

  if (!transport) {
    if (isProduction) {
      console.warn('[mail] SMTP_URL is not configured; dropping message to', message.to);
    } else {
      console.info(
        `[mail] (not sent — SMTP_URL unset)\n  to: ${message.to}\n  subject: ${message.subject}\n${message.text}`,
      );
    }
    return;
  }

  await transport.sendMail({ from: env.MAIL_FROM, ...message });
}
