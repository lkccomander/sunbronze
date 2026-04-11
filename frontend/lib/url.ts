function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export function getPublicUrl(request: Request, path: string): URL {
  const fallbackUrl = new URL(request.url);
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const host = forwardedHost || request.headers.get("host") || fallbackUrl.host;
  const protocol = forwardedProto || fallbackUrl.protocol.replace(":", "");

  return new URL(path, `${protocol}://${host}`);
}
