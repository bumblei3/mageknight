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
};

class Logger {
    constructor() {
        this.level = LOG_LEVELS.DEBUG;
        this.maxLogs = 100;
        this.logs = [];
        this.listeners = [];
        this.enabled = true;
    }

    setLevel(level) {
        this.level = level;
    }

    info(message, data = null) {
        this.log(LOG_LEVELS.INFO, message, data);
    }

    debug(message, data = null) {
        this.log(LOG_LEVELS.DEBUG, message, data);
    }

    warn(message, data = null) {
        this.log(LOG_LEVELS.WARN, message, data);
    }

    error(message, data = null) {
        this.log(LOG_LEVELS.ERROR, message, data);
    }

    verbose(message, data = null) {
        this.log(LOG_LEVELS.VERBOSE, message, data);
    }

    log(level, message, data) {
        if (!this.enabled || level < this.level) return;

        const logEntry = {
            timestamp: new Date(),
            level,
            levelName: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level),
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

    printToConsole(entry) {
        const time = entry.timestamp.toLocaleTimeString();
        const label = `[${entry.levelName}]`;
        const style = this.getConsoleStyle(entry.level);

        if (entry.data) {
            console.log(`%c${time} ${label} ${entry.message}`, style, entry.data);
        } else {
            console.log(`%c${time} ${label} ${entry.message}`, style);
        }
    }

    getConsoleStyle(level) {
        switch (level) {
            case LOG_LEVELS.VERBOSE: return 'color: #888';
            case LOG_LEVELS.DEBUG: return 'color: #3498db';
            case LOG_LEVELS.INFO: return 'color: #2ecc71';
            case LOG_LEVELS.WARN: return 'color: #f1c40f';
            case LOG_LEVELS.ERROR: return 'color: #e74c3c; font-weight: bold';
            default: return 'color: #fff';
        }
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    clearListeners() {
        this.listeners = [];
    }

    clear() {
        this.logs = [];
        this.listeners.forEach(callback => callback(null, this.logs));
    }
}

export const logger = new Logger();
window.logger = logger; // For console access
