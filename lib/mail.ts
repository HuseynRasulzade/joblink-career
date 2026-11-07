// One way to send e-mail. Resend (an HTTP API, needs only an API key and a
// verified sender address) works on any domain; the Cloudflare `EMAIL` binding
// is used when no Resend key is set.
import { renderMail, type MailAction } from "./mail-template.ts";
export type MailSettings = {
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  SITE_URL?: string;
  EMAIL?: {
    send: (message: {
      to: string[];
      from: { email: string; name: string };
      subject: string;
      text: string;
      html?: string;
    }) => Promise<unknown>;
  } | null;
};
export const mailConfigured = (settings: MailSettings) =>
  !!settings.EMAIL_FROM && !!(settings.RESEND_API_KEY || settings.EMAIL);

// Throws when the provider refuses the message; callers decide whether that matters.
export async function sendMail(
  settings: MailSettings,
  message: { to: string; subject: string; text: string; action?: MailAction; greeting?: string; eyebrow?: string; html?: string },
) {
  // Every message goes out as a branded HTML mail with the plain-text part beside it.
  const rendered = message.html ? { html: message.html, text: message.text } : renderMail({ subject: message.subject, text: message.text, action: message.action, greeting: message.greeting, eyebrow: message.eyebrow, siteUrl: settings.SITE_URL });
  if (!settings.EMAIL_FROM) throw new Error("E-poçt göndərən ünvanı qurulmayıb.");
  if (settings.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `JobMatch <${settings.EMAIL_FROM}>`,
        to: [message.to],
        subject: message.subject,
        text: rendered.text,
        html: rendered.html,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`E-poçt provayderi ${response.status} cavabı verdi.`);
    return;
  }
  if (!settings.EMAIL) throw new Error("E-poçt göndərmə qurulmayıb.");
  await settings.EMAIL.send({
    to: [message.to],
    from: { email: settings.EMAIL_FROM, name: "JobMatch" },
    subject: message.subject,
    text: rendered.text,
    html: rendered.html,
  });
}

// The same message interface as the Cloudflare binding, so jobs that take a
// mailer (digests, reminders) work with either provider.
export function mailerOf(settings: MailSettings): NonNullable<MailSettings["EMAIL"]> | null {
  if (!mailConfigured(settings)) return null;
  return {
    send: async (message) => {
      await sendMail(settings, { to: message.to[0], subject: message.subject, text: message.text });
    },
  };
}
