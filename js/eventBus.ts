/**
 * Lightweight Global Event Bus for Mage Knight
 */

type EventCallback<T = unknown> = (data: T) => void;

class EventBus {
    private listeners: Map<string, EventCallback[]>;

    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     */
    on<T = unknown>(event: string, callback: EventCallback<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback as EventCallback);
    }

    /**
     * Unsubscribe from an event
     */
    off<T = unknown>(event: string, callback: EventCallback<T>): void {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event)!;
        const index = callbacks.indexOf(callback as EventCallback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit an event
     */
    emit<T = unknown>(event: string, data?: T): void {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event)!.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Clear all listeners
     */
    clear(): void {
        this.listeners.clear();
    }
}

// Global instance
export const eventBus = new EventBus();
export default eventBus;
