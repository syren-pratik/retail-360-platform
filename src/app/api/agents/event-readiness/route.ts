import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/** Thin wrapper — forwards to the universal runner with agent_id preset. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const runnerBody = { ...body, agent_id: 'event-readiness' };
  return fetch(new URL('/api/agents/run', req.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: req.headers.get('cookie') ?? '',
    },
    body: JSON.stringify(runnerBody),
  });
}
