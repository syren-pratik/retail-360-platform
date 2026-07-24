/**
 * In-memory blob store for SSE-generated artifacts.
 *
 * Artifacts are generated inside the SSE stream (which can't transport
 * binary blobs to the client). We stash the buffer here under a short id
 * and hand the client a download URL like /api/ask/download/<id>.
 * Entries auto-expire after 10 minutes.
 */

interface StoredBlob {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  createdAt: number;
}

const store = new Map<string, StoredBlob>();

// Housekeeping — evict blobs older than 10 min.
setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000;
  store.forEach((v, k) => {
    if (v.createdAt < cutoff) store.delete(k);
  });
}, 60_000);

export function storeBlob(buffer: Buffer, filename: string, mimeType: string): string {
  const id = Math.random().toString(36).slice(2, 10);
  store.set(id, { buffer, filename, mimeType, createdAt: Date.now() });
  return id;
}

export function getBlob(id: string): StoredBlob | undefined {
  return store.get(id);
}
