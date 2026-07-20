import type { ERPSystem, ERPConnectionResult } from './action-types';

const SYSTEMS: { system: ERPSystem; delay: number; error: string }[] = [
  { system: 'SAP ERP', delay: 340, error: 'Not configured' },
  { system: 'Oracle NetSuite', delay: 520, error: 'Connection refused (port 8088)' },
  { system: 'Tally Prime', delay: 180, error: 'Host not found' },
];

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function checkERPConnections(
  onProgress?: (result: ERPConnectionResult) => void
): Promise<ERPConnectionResult[]> {
  const results: ERPConnectionResult[] = [];
  for (const { system, delay, error } of SYSTEMS) {
    const checking: ERPConnectionResult = { system, status: 'checking' };
    onProgress?.(checking);
    await wait(delay);
    const result: ERPConnectionResult = {
      system,
      status: 'failed',
      error,
      latency_ms: delay,
    };
    results.push(result);
    onProgress?.(result);
  }
  return results;
}

// ─── Comms system checks (email / chat) ───────────────────────────────────

export interface CommsConnectionResult {
  system: string;
  status: 'checking' | 'connected' | 'failed';
  error?: string;
  latency_ms?: number;
}

const COMMS_SYSTEMS: { system: string; delay: number; error: string }[] = [
  { system: 'Outlook / Exchange', delay: 280, error: 'Not configured' },
  { system: 'Gmail Workspace', delay: 190, error: 'OAuth not set up' },
  { system: 'Slack', delay: 340, error: 'Workspace not connected' },
];

export async function checkCommsConnections(
  onProgress?: (result: CommsConnectionResult) => void
): Promise<CommsConnectionResult[]> {
  const results: CommsConnectionResult[] = [];
  for (const { system, delay, error } of COMMS_SYSTEMS) {
    const checking: CommsConnectionResult = { system, status: 'checking' };
    onProgress?.(checking);
    await wait(delay);
    const result: CommsConnectionResult = {
      system,
      status: 'failed',
      error,
      latency_ms: delay,
    };
    results.push(result);
    onProgress?.(result);
  }
  return results;
}

export async function checkERPConnectionsWithSuccess(
  successSystem: ERPSystem,
  onProgress?: (result: ERPConnectionResult) => void
): Promise<ERPConnectionResult[]> {
  const results: ERPConnectionResult[] = [];
  for (const { system, delay, error } of SYSTEMS) {
    const checking: ERPConnectionResult = { system, status: 'checking' };
    onProgress?.(checking);
    await wait(delay);
    const isSuccess = system === successSystem;
    const result: ERPConnectionResult = isSuccess
      ? { system, status: 'connected', latency_ms: delay }
      : { system, status: 'failed', error, latency_ms: delay };
    results.push(result);
    onProgress?.(result);
  }
  return results;
}
