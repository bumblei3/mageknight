/**
 * Structured Logging System for Mage Knight
 * Supports different log levels and UI synchronization.
 */

export const LOG_LEVELS = {
    VERBOSE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    NONE: 5
} as const;

export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    levelName: string;
    message: string;
    data: any | null;
}

export type LogListener = (entry: LogEntry | null, logs: LogEntry[]) => void;

class Logger {
    public level: LogLevel;
    public maxLogs: number;
    public logs: LogEntry[];
    public listeners: LogListener[];
    public enabled: boolean;

    constructor() {
        this.level = LOG_LEVELS.DEBUG;
        this.maxLogs = 100;
        this.logs = [];
        this.listeners = [];
        this.enabled = true;
    }

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    info(message: string, data: any = null): void {
        this.log(LOG_LEVELS.INFO, message, data);
    }

    debug(message: string, data: any = null): void {
        this.log(LOG_LEVELS.DEBUG, message, data);
    }

    warn(message: string, data: any = null): void {
        this.log(LOG_LEVELS.WARN, message, data);
    }

    error(message: string, data: any = null): void {
        this.log(LOG_LEVELS.ERROR, message, data);
    }

    verbose(message: string, data: any = null): void {
        this.log(LOG_LEVELS.VERBOSE, message, data);
    }

    log(level: LogLevel, message: string, data: any): void {
        if (!this.enabled || level < this.level) return;

        const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key as keyof typeof LOG_LEVELS] === level) || 'UNKNOWN';

        const logEntry: LogEntry = {
            timestamp: new Date(),
            level,
            levelName,
            message,
            data
        };

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Console output
        this.printToConsole(logEntry);

        // Notify listeners
        this.listeners.forEach(callback => callback(logEntry, this.logs));
    }

    printToConsole(entry: LogEntry): void {
        const time = entry.timestamp.toLocaleTimeString();
        const label = `[${entry.levelName}]`;
        const style = this.getConsoleStyle(entry.level);

        if (entry.data) {
            console.log(`%c${time} ${label} ${entry.message}`, style, entry.data);
        } else {
            console.log(`%c${time} ${label} ${entry.message}`, style);
        }
    }

    getConsoleStyle(level: LogLevel): string {
        switch (level) {
            case LOG_LEVELS.VERBOSE: return 'color: #888';
            case LOG_LEVELS.DEBUG: return 'color: #3498db';
            case LOG_LEVELS.INFO: return 'color: #2ecc71';
            case LOG_LEVELS.WARN: return 'color: #f1c40f';
            case LOG_LEVELS.ERROR: return 'color: #e74c3c; font-weight: bold';
            default: return 'color: #fff';
        }
    }

    addListener(callback: LogListener): void {
        this.listeners.push(callback);
    }

    clearListeners(): void {
        this.listeners = [];
    }

    clear(): void {
        this.logs = [];
        this.listeners.forEach(callback => callback(null, this.logs));
    }
}

export const logger = new Logger();
(window as any).logger = logger; // For console access
