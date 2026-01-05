
import { describe, it, expect, beforeEach } from './testRunner.js';
import { TooltipManager } from '../js/ui/TooltipManager.js';
import { NotificationManager } from '../js/ui/NotificationManager.js';

// Mock UI elements
const mockElements = {
    gameLog: document.createElement('div')
};

// Mock i18n global just in case, though imports should handle it if setup correctly. 
// Assuming t is working or we rely on the implementation.

describe('Interactive Tooltips', () => {
    let tooltipManager;
    let notificationManager;

    beforeEach(() => {
        tooltipManager = new TooltipManager();
        notificationManager = new NotificationManager(mockElements, tooltipManager);
        mockElements.gameLog.innerHTML = '';
    });

    it('should inject keywords into text', () => {
        const text = 'Das ist eine Wunde und Gift.';
        const result = tooltipManager.injectKeywords(text);

        // Check for wrapper spans
        expect(result).toContain('data-term="wound"');
        expect(result).toContain('data-term="poison"');
        expect(result).toContain('>Wunde</span>');
        expect(result).toContain('>Gift</span>');
    });

    it('should not inject keywords inside other tags (basic check)', () => {
        // Our regex is simple \b(term)\b so it shouldn't match parts of words, but naive replace might match inside attributes if careful.
        // Current implementation uses simple replacement.
        const text = 'Wunderbar';
        const result = tooltipManager.injectKeywords(text);
        expect(result).toBe('Wunderbar'); // "Wunde" shouldn't match "Wunderbar" due to \b
    });

    it('should integrate with NotificationManager', () => {
        notificationManager.addLog('Test Wunde Log');
        const entry = mockElements.gameLog.lastElementChild;
        const msg = entry.querySelector('.log-message');

        expect(msg.innerHTML).toContain('class="glossary-term"');
        expect(msg.innerHTML).toContain('data-term="wound"');
    });
});
