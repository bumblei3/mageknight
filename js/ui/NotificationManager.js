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

    constructor(elements, tooltipManager) {
        this.elements = elements;
        this.tooltipManager = tooltipManager;
        this.setupToastContainer();

        // Allow tooltips on log container
        if (this.elements.gameLog && this.tooltipManager) {
            this.tooltipManager.attachToElement(this.elements.gameLog, null);
        }
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
    addLog(message, type = 'info', details = null) {
        const logContainer = this.elements.gameLog;
        if (!logContainer) return;

        if (message === null || message === undefined) return;
        const msgStr = String(message);

        // Check for grouping (duplicate consecutive messages)
        // Only group if NO details are present (details make each entry unique usually)
        const lastEntry = logContainer.lastElementChild;
        if (!details && lastEntry && lastEntry.dataset.message === msgStr && !lastEntry.dataset.hasDetails) {
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
        entry.dataset.message = msgStr;
        entry.dataset.count = '1';
        if (details) entry.dataset.hasDetails = 'true';

        const now = new Date();
        const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const icon = NotificationManager.LOG_ICONS[type] || NotificationManager.LOG_ICONS.info;

        let formattedMessage = msgStr
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');

        if (this.tooltipManager) {
            formattedMessage = this.tooltipManager.injectKeywords(formattedMessage);
        }

        let detailsHTML = '';
        if (details) {
            detailsHTML = '<div class="log-details">';

            // If details is an array (e.g. list of sub-events)
            if (Array.isArray(details)) {
                detailsHTML += '<ul>';
                details.forEach(item => detailsHTML += `<li>${item}</li>`);
                detailsHTML += '</ul>';
            }
            // If object, render key-values or specific formatting
            else if (typeof details === 'object') {
                // Check if it has a 'title' or 'items' structure
                if (details.items && Array.isArray(details.items)) {
                    if (details.title) detailsHTML += `<div class="details-title">${details.title}</div>`;
                    detailsHTML += '<ul>';
                    details.items.forEach(item => detailsHTML += `<li>${item}</li>`);
                    detailsHTML += '</ul>';
                } else {
                    // Generic object renderer
                    detailsHTML += '<ul>';
                    for (const [key, value] of Object.entries(details)) {
                        // Skip specific keys if needed
                        detailsHTML += `<li><span class="detail-key">${key}:</span> <span class="detail-value">${value}</span></li>`;
                    }
                    detailsHTML += '</ul>';
                }
            } else {
                detailsHTML += String(details);
            }
            detailsHTML += '</div>';

            // Make message clickable to toggle details if details present
            entry.classList.add('has-details');
            entry.addEventListener('click', (_e) => {
                entry.classList.toggle('expanded');
            });
        }

        entry.innerHTML = `
            <div class="log-header">
                <span class="log-time" title="${now.toLocaleTimeString()}">${timeStr}</span>
                <span class="log-icon">${icon}</span>
                <span class="log-message">${formattedMessage}</span>
                <span class="log-count" style="display: none;">×1</span>
                ${details ? '<span class="log-expander">▼</span>' : ''}
            </div>
            ${detailsHTML}
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
