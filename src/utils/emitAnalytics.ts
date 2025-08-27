export type AnalyticsPayload = Record<string, unknown>;

export function emitAnalytics(event: string, payload: AnalyticsPayload) {
  try {
    // @ts-ignore plausible optional
    window.plausible?.(event, { props: payload });
  } catch {}
  try {
    // @ts-ignore gtag optional
    window.gtag?.('event', event, payload);
  } catch {}
}