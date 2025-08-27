// Tiny, dependency-free string helpers used across app & scripts.

export const trimSlashes = (s: string = "") =>
  String(s).replace(/^\/+/, "").replace(/\/+$/, "");

export const squash = (s: string = "") =>
  String(s).replace(/\/{2,}/g, "/");

export const withTrailingSlash = (p: string = "/") =>
  /\.([a-z0-9]+)$/i.test(p) ? String(p) : String(p).replace(/\/+$/, "") + "/";
