/**
 * Offline save queue with background-sync semantics.
 *
 * When a save fails (offline / quota), the serialized state is queued in
 * localStorage. On the next `online` event (or explicit `flush()`), the queue
 * is drained by re-attempting each save through the provided saver.
 */

const QUEUE_KEY = 'mk_sync_queue';

export interface QueuedSave {
    slotKey: string;
    state: any;
    queuedAt: number;
}

export class SyncQueue {
    static load(): QueuedSave[] {
        try {
            const raw = localStorage.getItem(QUEUE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    static save(queue: QueuedSave[]): void {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        } catch {
            /* ignore */
        }
    }

    static enqueue(slotKey: string | number, state: any): void {
        const queue = this.load();
        // Replace any pending save for the same slot (latest wins).
        const filtered = queue.filter((q) => String(q.slotKey) !== String(slotKey));
        filtered.push({ slotKey: String(slotKey), state, queuedAt: Date.now() });
        this.save(filtered);
    }

    static clear(): void {
        try { localStorage.removeItem(QUEUE_KEY); } catch { /* ignore */ }
    }

    static size(): number {
        return this.load().length;
    }

    /**
     * Drain the queue using the provided saver. Returns the number of saves
     * that were successfully flushed.
     */
    static async flush(saver: (slotKey: string, state: any) => Promise<boolean> | boolean): Promise<number> {
        const queue = this.load();
        if (queue.length === 0) return 0;

        let flushed = 0;
        const remaining: QueuedSave[] = [];
        for (const item of queue) {
            try {
                const ok = await saver(item.slotKey, item.state);
                if (ok) flushed++;
                else remaining.push(item);
            } catch {
                remaining.push(item);
            }
        }
        this.save(remaining);
        return flushed;
    }

    /**
     * Wire automatic flushing to the browser `online` event. Returns an
     * unsubscribe function.
     */
    static onOnline(saver: (slotKey: string, state: any) => Promise<boolean> | boolean): () => void {
        if (typeof window === 'undefined') return () => {};
        const handler = () => { this.flush(saver).catch(() => {}); };
        window.addEventListener('online', handler);
        return () => window.removeEventListener('online', handler);
    }
}
