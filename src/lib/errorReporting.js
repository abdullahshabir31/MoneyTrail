export function reportRuntimeError(error, context = {}) {
  if (typeof window === "undefined") return;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error("[error-boundary]", message, {
    ...context,
    stack,
    route: window.location.pathname,
  });
}
