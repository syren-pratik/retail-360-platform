import type { ColdstartPayload } from './coldstart-types';

export async function fetchColdstartPayload(): Promise<ColdstartPayload> {
  const res = await fetch('/api/coldstart/payload', { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error ?? `Cold-start API returned ${res.status}. Run: npm run gen:coldstart-data`
    );
  }
  return res.json();
}
