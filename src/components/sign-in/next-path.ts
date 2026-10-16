/** Accepts only same-site paths ("/x"), never "//host" or absolute URLs. */
export function safeNextPath(value: unknown): string | undefined {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : undefined;
}
