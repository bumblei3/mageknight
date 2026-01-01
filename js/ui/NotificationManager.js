/**
 * Manages game log and toast notifications.
 */
export class NotificationManager {
    static LOG_MAX_ENTRIES = 50;
    static LOG_ICONS = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        combat: '⚔️',
        discovery: '🗺️',
        achievement: '🏆',
        levelup: '⬆️'
    };

    constructor(elements) {
        this.elements = elements;
        this.setupToastContainer();
    }

    setupToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

    /**
     * Show notification (log + toast)
     */
    showNotification(message, type = 'info') {
        this.addLog(message, type);
        this.showToast(message, type);
    }

    /**
     * Add log entry
     */
    addLog(message, type = 'info') {
        const logContainer = this.elements.gameLog;
        if (!logContainer) return;

        if (message === null || message === undefined) return;
        message = String(message);

        // Check for grouping (duplicate consecutive messages)
        const lastEntry = logContainer.lastElementChild;
        if (lastEntry && lastEntry.dataset.message === message) {
            let count = parseInt(lastEntry.dataset.count || '1', 10) + 1;
            lastEntry.dataset.count = count;
            const countBadge = lastEntry.querySelector('.log-count');
            if (countBadge) {
                countBadge.textContent = `×${count}`;
                countBadge.style.display = 'inline';
            }
            logContainer.scrollTop = logContainer.scrollHeight;
            return;
        }

        // Create new entry
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.dataset.message = message;
        entry.dataset.count = '1';

        const now = new Date();
        const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const icon = NotificationManager.LOG_ICONS[type] || NotificationManager.LOG_ICONS.info;

        if (message === null || message === undefined) return;
        const msgStr = String(message);

        let formattedMessage = msgStr
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');

        entry.innerHTML = `
            <span class="log-time">${timeStr}</span>
            <span class="log-icon">${icon}</span>
            <span class="log-message">${formattedMessage}</span>
            <span class="log-count" style="display: none;">×1</span>
        `;

        logContainer.appendChild(entry);

        while (logContainer.childElementCount > NotificationManager.LOG_MAX_ENTRIES) {
            logContainer.removeChild(logContainer.firstElementChild);
        }

        logContainer.scrollTop = logContainer.scrollHeight;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (!this.toastContainer) this.setupToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            combat: '⚔️',
            info: 'ℹ️',
            achievement: '🏆',
            levelup: '⬆️'
        };

        const icon = icons[type] || icons.info;
        toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-message">${message}</span>`;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    /**
     * Clear log
     */
    clearLog() {
        if (this.elements.gameLog) {
            this.elements.gameLog.innerHTML = '';
        }
    }
}
