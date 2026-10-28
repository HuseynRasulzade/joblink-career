// Headers every answer carries. None of them limits which scripts the site runs
// (a full script policy would have to list every map and image host and is easy
// to get wrong); they stop the site being framed by others, force HTTPS, stop
// content-type guessing and keep the camera for the exam room only.
export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()",
  "Content-Security-Policy": "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export function withSecurityHeaders(response: Response) {
  // Redirects and responses with immutable headers are rebuilt; the body is passed through.
  const out = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(name)) out.headers.set(name, value);
  return out;
}
