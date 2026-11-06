// The HTML of every e-mail Joblink sends: one branded layout (table-based, inline styles, so it reads the same in
// Gmail, Outlook and phones). The plain-text part is always sent too. All text is escaped; web addresses become links.
export type MailAction = { label: string; url: string };
export type MailContent = { subject: string; text: string; action?: MailAction; siteUrl?: string };

const BRAND = "#147b70";
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeUrl = (url: string) => (/^https?:\/\/[^\s"'<>]+$/i.test(url) ? url : "");

// Plain text → paragraphs; a line of "label: value" pairs stays as lines; links are clickable.
function paragraphs(text: string): string {
  const linked = (line: string) =>
    escapeHtml(line).replace(/https?:\/\/[^\s<]+/g, (url) => {
      const clean = url.replace(/[.,;:!?)]+$/, "");
      const tail = url.slice(clean.length);
      return safeUrl(clean.replace(/&amp;/g, "&")) ? `<a href="${clean}" style="color:${BRAND};font-weight:600;">${clean}</a>${tail}` : url;
    });
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#27393d;">${block.split("\n").map(linked).join("<br>")}</p>`)
    .join("");
}

export function renderMail({ subject, text, action, siteUrl }: MailContent): { html: string; text: string } {
  const home = safeUrl(siteUrl || "");
  const button = action && safeUrl(action.url)
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:10px;background:${BRAND};"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(action.label)}</a></td></tr></table>`
    : "";
  const preheader = escapeHtml(text.replace(/\s+/g, " ").trim().slice(0, 110));
  const html = `<!doctype html>
<html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e3ebea;">
<tr><td style="background:#0f3d38;padding:22px 32px;"><span style="font-size:26px;font-weight:800;letter-spacing:-1px;color:#ffffff;">joblink</span><span style="font-size:26px;font-weight:800;color:#7fd6c8;">&#10035;</span></td></tr>
<tr><td style="padding:32px 32px 8px;">
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#172d31;">${escapeHtml(subject)}</h1>
${paragraphs(text)}
${button}
</td></tr>
<tr><td style="padding:0 32px 28px;"><div style="border-top:1px solid #e3ebea;padding-top:18px;font-size:13px;line-height:1.6;color:#6b7a7d;">Bu e-poçt Joblink platformasından avtomatik göndərilib.${home ? ` <a href="${home}" style="color:${BRAND};">${escapeHtml(home.replace(/^https?:\/\//, ""))}</a>` : ""}<br>Hansı bildirişləri e-poçtla almaq istədiyinizi Hesab ayarlarında dəyişə bilərsiniz.</div></td></tr>
</table></td></tr></table></body></html>`;
  return { html, text: action && safeUrl(action.url) ? `${text.trim()}\n\n${action.label}: ${action.url}` : text };
}
