// Self-hosted runs sit behind nginx, which ends TLS: the app sees plain http while the browser sends an https Origin, and the
// origin checks (`new URL(request.url).origin`) would refuse every sign-in. With TRUST_PROXY=1 the scheme the proxy reports is used.
// The header is trusted only on that switch: the app must listen on 127.0.0.1 behind a proxy that overwrites X-Forwarded-Proto.
export function behindProxy(request: Request, trustProxy: string | undefined): Request {
  if (trustProxy !== "1") return request;
  if (request.headers.get("x-forwarded-proto") !== "https") return request;
  const url = new URL(request.url);
  if (url.protocol !== "http:") return request;
  url.protocol = "https:";
  return new Request(url, request);
}
