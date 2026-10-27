// One way to send e-mail. Resend (an HTTP API, needs only an API key and a
// verified sender address) works on any domain; the Cloudflare `EMAIL` binding
// is used when no Resend key is set.
export type MailSettings = {
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  EMAIL?: {
    send: (message: {
      to: string[];
      from: { email: string; name: string };
      subject: string;
      text: string;
    }) => Promise<unknown>;
  } | null;
};
export const mailConfigured = (settings: MailSettings) =>
  !!settings.EMAIL_FROM && !!(settings.RESEND_API_KEY || settings.EMAIL);

// Throws when the provider refuses the message; callers decide whether that matters.
export async function sendMail(
  settings: MailSettings,
  message: { to: string; subject: string; text: string },
) {
  if (!settings.EMAIL_FROM) throw new Error("E-poçt göndərən ünvanı qurulmayıb.");
  if (settings.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Joblink <${settings.EMAIL_FROM}>`,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`E-poçt provayderi ${response.status} cavabı verdi.`);
    return;
  }
  if (!settings.EMAIL) throw new Error("E-poçt göndərmə qurulmayıb.");
  await settings.EMAIL.send({
    to: [message.to],
    from: { email: settings.EMAIL_FROM, name: "Joblink" },
    subject: message.subject,
    text: message.text,
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
