import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationManager } from '../js/ui/NotificationManager.js';
import { NotificationManager } from '../js/ui/NotificationManager.js';
import { store } from '../js/game/Store.js';
import { afterEach } from 'vitest';

/**
 * Tests for NotificationManager - log grouping, limits, and toasts.
 */

describe('NotificationManager', () => {
    let notificationManager;
    let mockElements;

    beforeEach(() => {
        mockElements = {
            gameLog: document.createElement('div')
        };
        notificationManager = new NotificationManager(mockElements);
    });

    afterEach(() => {
        if (store) store.clearListeners();
        document.body.innerHTML = '';
    });

    describe('Log Entry Creation', () => {
        it('should add a log entry with correct structure', () => {
            notificationManager.addLog('Test message', 'info');
            expect(mockElements.gameLog.children.length).toBe(1);
            const entry = mockElements.gameLog.children[0];
            expect(entry.classList.contains('log-entry')).toBe(true);
            expect(entry.classList.contains('info')).toBe(true);
        });

        it('should add multiple log entries', () => {
            notificationManager.addLog('Message 1', 'info');
            notificationManager.addLog('Message 2', 'success');
            notificationManager.addLog('Message 3', 'error');
            expect(mockElements.gameLog.children.length).toBe(3);
        });

        it('should include timestamp in log entry', () => {
            notificationManager.addLog('Test message', 'info');
            const entry = mockElements.gameLog.children[0];
            expect(entry.textContent).toContain(':'); // Time format HH:MM
        });

        it('should include icon in log entry', () => {
            notificationManager.addLog('Test message', 'success');
            const entry = mockElements.gameLog.children[0];
            expect(entry.textContent).toContain('✅');
        });

        it('should handle null message gracefully', () => {
            notificationManager.addLog(null, 'info');
            expect(mockElements.gameLog.children.length).toBe(0);
        });

        it('should handle undefined message gracefully', () => {
            notificationManager.addLog(undefined, 'info');
            expect(mockElements.gameLog.children.length).toBe(0);
        });
    });

    describe('Log Entry Grouping', () => {
        it('should group duplicate consecutive messages', () => {
            notificationManager.addLog('Repeated message', 'info');
            notificationManager.addLog('Repeated message', 'info');
            notificationManager.addLog('Repeated message', 'info');

            // Should still be only 1 entry
            expect(mockElements.gameLog.children.length).toBe(1);

            const entry = mockElements.gameLog.children[0];
            expect(String(entry.dataset.count)).toBe('3');
        });

        it('should not group different messages', () => {
            notificationManager.addLog('Message A', 'info');
            notificationManager.addLog('Message B', 'info');

            expect(mockElements.gameLog.children.length).toBe(2);
        });

        it('should start new group after different message', () => {
            notificationManager.addLog('Message A', 'info');
            notificationManager.addLog('Message B', 'info');
            notificationManager.addLog('Message A', 'info'); // New entry, not grouped with first

            expect(mockElements.gameLog.children.length).toBe(3);
        });
    });

    describe('Log Entry Limit', () => {
        it('should enforce max entry limit', () => {
            // Add more than LOG_MAX_ENTRIES
            for (let i = 0; i < 55; i++) {
                notificationManager.addLog(`Message ${i}`, 'info');
            }

            // Should have at most LOG_MAX_ENTRIES
            expect(mockElements.gameLog.children.length).toBeLessThanOrEqual(50);
        });

        it('should remove oldest entries when limit exceeded', () => {
            for (let i = 0; i < 55; i++) {
                notificationManager.addLog(`Message ${i}`, 'info');
            }

            // First entry should be "Message 5" or later (first 5 removed)
            const firstEntry = mockElements.gameLog.children[0];
            expect(firstEntry.textContent).not.toContain('Message 0');
        });
    });

    describe('Log Types', () => {
        it('should use correct icon for info type', () => {
            notificationManager.addLog('Info', 'info');
            expect(mockElements.gameLog.children[0].textContent).toContain('ℹ️');
        });

        it('should use correct icon for success type', () => {
            notificationManager.addLog('Success', 'success');
            expect(mockElements.gameLog.children[0].textContent).toContain('✅');
        });

        it('should use correct icon for error type', () => {
            notificationManager.addLog('Error', 'error');
            expect(mockElements.gameLog.children[0].textContent).toContain('❌');
        });

        it('should use correct icon for warning type', () => {
            notificationManager.addLog('Warning', 'warning');
            expect(mockElements.gameLog.children[0].textContent).toContain('⚠️');
        });

        it('should use correct icon for combat type', () => {
            notificationManager.addLog('Combat', 'combat');
            expect(mockElements.gameLog.children[0].textContent).toContain('⚔️');
        });

        it('should use correct icon for achievement type', () => {
            notificationManager.addLog('Achievement', 'achievement');
            expect(mockElements.gameLog.children[0].textContent).toContain('🏆');
        });

        it('should use correct icon for levelup type', () => {
            notificationManager.addLog('Level Up', 'levelup');
            expect(mockElements.gameLog.children[0].textContent).toContain('⬆️');
        });
    });

    describe('Clear Log', () => {
        it('should clear all log entries', () => {
            notificationManager.addLog('Message 1', 'info');
            notificationManager.addLog('Message 2', 'info');
            notificationManager.clearLog();
            expect(mockElements.gameLog.innerHTML).toBe('');
        });

        it('should handle clearing empty log', () => {
            notificationManager.clearLog();
            expect(mockElements.gameLog.innerHTML).toBe('');
        });
    });

    describe('Toast Notifications', () => {
        it('should create toast container on initialization', () => {
            expect(notificationManager.toastContainer).toBeDefined();
        });

        it('should add toast to container', () => {
            notificationManager.showToast('Test toast', 'info');
            expect(notificationManager.toastContainer.children.length).toBe(1);
        });

        it('should include message in toast', () => {
            notificationManager.showToast('Hello World', 'success');
            expect(notificationManager.toastContainer.textContent).toContain('Hello World');
        });

        it('should add correct class for toast type', () => {
            notificationManager.showToast('Error toast', 'error');
            const toast = notificationManager.toastContainer.children[0];
            expect(toast.classList.contains('toast')).toBe(true);
            expect(toast.classList.contains('error')).toBe(true);
        });

        it('should add multiple toasts', () => {
            notificationManager.showToast('Toast 1', 'info');
            notificationManager.showToast('Toast 2', 'success');
            notificationManager.showToast('Toast 3', 'warning');
            expect(notificationManager.toastContainer.children.length).toBe(3);
        });
    });

    describe('showNotification', () => {
        it('should add both log entry and toast', () => {
            notificationManager.showNotification('Full notification', 'info');
            expect(mockElements.gameLog.children.length).toBe(1);
            expect(notificationManager.toastContainer.children.length).toBe(1);
        });
    });

    describe('Markdown Formatting', () => {
        it('should format bold text with **', () => {
            notificationManager.addLog('**Bold text**', 'info');
            const entry = mockElements.gameLog.children[0];
            expect(entry.innerHTML).toContain('<strong>Bold text</strong>');
        });

        it('should format italic text with *', () => {
            notificationManager.addLog('*Italic text*', 'info');
            const entry = mockElements.gameLog.children[0];
            expect(entry.innerHTML).toContain('<em>Italic text</em>');
        });
    });
});
