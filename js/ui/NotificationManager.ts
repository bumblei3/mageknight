import { UIElements } from '../ui';
import { TooltipManager } from './TooltipManager';

/**
 * Manages game log and toast notifications.
 */
export class NotificationManager {
    public static readonly LOG_MAX_ENTRIES = 50;
    public static readonly LOG_ICONS: Record<string, string> = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        combat: '⚔️',
        discovery: '🗺️',
        achievement: '🏆',
        levelup: '⬆️'
    };

    private elements: UIElements;
    private tooltipManager: TooltipManager;
    private toastContainer: HTMLElement | null = null;
    private activeFilters: Set<string> = new Set(['all']);
    private filterBar: HTMLElement | null = null;

    constructor(elements: UIElements, tooltipManager: TooltipManager) {
        this.elements = elements;
        this.tooltipManager = tooltipManager;
        this.setupToastContainer();
        this.createFilterBar();

        // Allow tooltips on log container
        if (this.elements.gameLog && this.tooltipManager) {
            this.tooltipManager.attachToElement(this.elements.gameLog, (null as any));
        }
    }

    private setupToastContainer(): void {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

    /** Create the log filter bar */
    private createFilterBar(): void {
        const logContainer = this.elements.gameLog;
        if (!logContainer || !logContainer.parentElement) return;

        this.filterBar = document.createElement('div');
        this.filterBar.className = 'log-filter-bar';
        this.filterBar.style.cssText = 'display:flex;gap:4px;padding:4px 8px;background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.1);';

        const filters = [
            { id: 'all', label: 'Alle', icon: '📋' },
            { id: 'combat', label: 'Kampf', icon: '⚔️' },
            { id: 'success', label: 'Erfolg', icon: '✅' },
            { id: 'error', label: 'Fehler', icon: '❌' },
            { id: 'warning', label: 'Warnung', icon: '⚠️' },
            { id: 'info', label: 'Info', icon: 'ℹ️' },
        ];

        filters.forEach(f => {
            const btn = document.createElement('button');
            btn.className = `log-filter-btn ${f.id === 'all' ? 'active' : ''}`;
            btn.dataset.filter = f.id;
            btn.title = f.label;
            btn.style.cssText = 'font-size:0.7rem;padding:2px 6px;border:1px solid rgba(255,255,255,0.15);background:' + (f.id === 'all' ? 'rgba(251,191,36,0.3)' : 'transparent') + ';color:#cbd5e1;border-radius:4px;cursor:pointer;';
            btn.textContent = f.icon;
            btn.addEventListener('click', () => this.toggleFilter(f.id));
            this.filterBar!.appendChild(btn);
        });

        logContainer.parentElement.insertBefore(this.filterBar, logContainer);
    }

    /** Toggle a filter on/off */
    private toggleFilter(filterId: string): void {
        if (filterId === 'all') {
            this.activeFilters = new Set(['all']);
        } else {
            this.activeFilters.delete('all');
            if (this.activeFilters.has(filterId)) {
                this.activeFilters.delete(filterId);
                if (this.activeFilters.size === 0) {
                    this.activeFilters.add('all');
                }
            } else {
                this.activeFilters.add(filterId);
            }
        }
        this.updateFilterButtons();
        this.applyFilters();
    }

    /** Update filter button visual state */
    private updateFilterButtons(): void {
        if (!this.filterBar) return;
        this.filterBar.querySelectorAll('.log-filter-btn').forEach(btn => {
            const htmlBtn = btn as HTMLElement;
            const filterId = htmlBtn.dataset.filter!;
            const isActive = this.activeFilters.has(filterId);
            htmlBtn.style.background = isActive ? 'rgba(251,191,36,0.3)' : 'transparent';
            htmlBtn.style.borderColor = isActive ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.15)';
        });
    }

    /** Apply active filters to log entries */
    private applyFilters(): void {
        const logContainer = this.elements.gameLog;
        if (!logContainer) return;
        const entries = logContainer.querySelectorAll('.log-entry');
        entries.forEach(entry => {
            const htmlEntry = entry as HTMLElement;
            const classes = htmlEntry.className.split(' ');
            const type = classes.length > 1 ? classes[1] : 'info';
            const visible = this.activeFilters.has('all') || this.activeFilters.has(type);
            htmlEntry.style.display = visible ? '' : 'none';
        });
    }

    /**
     * Show notification (log + toast)
     */
    public showNotification(message: string, type: string = 'info'): void {
        this.addLog(message, type);
        this.showToast(message, type);
    }

    /**
     * Add log entry
     */
    public addLog(message: any, type: string = 'info', details: any = null): void {
        const logContainer = this.elements.gameLog;
        if (!logContainer) return;

        if (message === null || message === undefined) return;
        const msgStr = String(message);

        // Check for grouping (duplicate consecutive messages)
        // Only group if NO details are present (details make each entry unique usually)
        const lastEntry = logContainer.lastElementChild as HTMLElement;
        if (!details && lastEntry && lastEntry.dataset.message === msgStr && !lastEntry.dataset.hasDetails) {
            let count = parseInt(lastEntry.dataset.count || '1', 10) + 1;
            lastEntry.dataset.count = count.toString();
            const countBadge = lastEntry.querySelector('.log-count') as HTMLElement;
            if (countBadge) {
                countBadge.textContent = `×${count}`;
                countBadge.style.display = 'inline';
            }
            requestAnimationFrame(() => {
                logContainer.scrollTop = logContainer.scrollHeight;
            });
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
                    (details.items as any[]).forEach(item => detailsHTML += `<li>${item}</li>`);
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
            logContainer.removeChild(logContainer.firstElementChild!);
        }

        requestAnimationFrame(() => {
            logContainer.scrollTop = logContainer.scrollHeight;
        });
    }

    /**
     * Show toast notification
     */
    public showToast(message: string, type: string = 'info'): void {
        if (!this.toastContainer) this.setupToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons: Record<string, string> = {
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
        this.toastContainer!.appendChild(toast);

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
    public clearLog(): void {
        if (this.elements.gameLog) {
            this.elements.gameLog.innerHTML = '';
        }
    }
}
