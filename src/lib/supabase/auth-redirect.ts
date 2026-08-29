/** Absolute URL for Supabase email / OAuth redirects (client-only). */
export function authRedirectTo(path: string) {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${path}`;
}
