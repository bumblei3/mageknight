import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import {
    createMockWindow,
    createMockDocument,
    resetMocks
} from './test-mocks.js';

describe('Global Events & Shortcuts', () => {
    let game;

    beforeEach(() => {
        document.body.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.id = 'game-board';
        document.body.appendChild(canvas);

        // Helper elements for shortcuts
        const helpModal = document.createElement('div');
        helpModal.id = 'help-modal';
        document.body.appendChild(helpModal);

        const helpBtn = document.createElement('button');
        helpBtn.id = 'help-btn';
        document.body.appendChild(helpBtn);

        game = new MageKnightGame();
    });

    afterEach(() => {
        resetMocks();
    });

    describe('Keyboard Shortcuts', () => {
        it('should handle various keyboard shortcuts', () => {
            // Mock methods to see if they are called
            const methods = ['endTurn', 'rest', 'explore', 'openSaveDialog', 'openLoadDialog', 'showTutorial', 'exitMovementMode'];
            const calls = {};
            methods.forEach(m => {
                calls[m] = 0;
                game[m] = () => { calls[m]++; };
            });

            // Space -> endTurn
            document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
            expect(calls.endTurn).toBe(1);

            // H -> help-btn click
            let helpClicked = false;
            document.getElementById('help-btn').addEventListener('click', () => {
                helpClicked = true;
                document.getElementById('help-modal').classList.remove('active');
            });
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
            expect(helpClicked).toBe(true);
            document.getElementById('help-modal').classList.remove('active');

            // R -> rest
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
            expect(calls.rest).toBe(1);

            // E -> explore
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
            expect(calls.explore).toBe(1);

            // Ctrl+S -> openSaveDialog
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
            expect(calls.openSaveDialog).toBe(1);

            // Ctrl+L -> openLoadDialog
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true }));
            expect(calls.openLoadDialog).toBe(1);

            // T -> showTutorial
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
            expect(calls.showTutorial).toBe(1);

            // Escape -> exitMovementMode
            game.movementMode = true;
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(calls.exitMovementMode).toBe(1);

            // M -> Mana Panel scroll
            const manaPanel = document.createElement('div');
            manaPanel.className = 'mana-panel';
            document.body.appendChild(manaPanel);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
            expect(manaPanel.classList.contains('highlight-pulse')).toBe(true);
        });
    });

    describe('App Startup', () => {
        it('should instantiate game on DOMContentLoaded', () => {
            document.dispatchEvent(new Event('DOMContentLoaded'));
            expect(window.game).toBeDefined();
            expect(window.game instanceof MageKnightGame).toBe(true);
        });
    });
});
