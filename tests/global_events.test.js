import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/game/Store.js';
import { eventBus } from '../js/eventBus.js';

describe('Global Events & Shortcuts', () => {
    let game;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = `
            <canvas id="game-board"></canvas>
            <div id="help-modal"></div>
            <button id="help-btn"></button>
            <div id="game-log"></div>
            <div id="phase-indicator"></div>
            <div id="hand-cards"></div>
            <div id="mana-source"></div>
            <div id="fame-value">0</div>
            <div id="reputation-value">0</div>
            <div id="hero-armor">0</div>
            <div id="hero-handlimit">0</div>
            <div id="hero-wounds">0</div>
            <div id="hero-name"></div>
            <div id="movement-points">0</div>
            <div id="skill-list"></div>
            <div id="healing-points">0</div>
            <div id="mana-bank"></div>
            <div id="particle-layer"></div>
            <div id="visit-btn"></div>
            <button id="undo-btn"></button>
            <button id="end-turn-btn"></button>
        `;

        game = new MageKnightGame();
    });

    afterEach(() => {
        if (game && game.destroy) game.destroy();
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
        eventBus.clear();
    });

    describe('Keyboard Shortcuts', () => {
        it('should handle various keyboard shortcuts', () => {
            // Mock methods to see if they are called
            const methods = ['endTurn', 'rest', 'explore', 'openSaveDialog', 'openLoadDialog', 'showTutorial', 'exitMovementMode'];
            const calls = {};
            methods.forEach(m => {
                calls[m] = 0;
                if (m === 'endTurn') {
                    game.turnManager.endTurn = () => { calls[m]++; };
                } else if (m === 'rest') {
                    game.phaseManager.rest = () => { calls[m]++; };
                } else if (m === 'explore') {
                    game.actionManager.explore = () => { calls[m]++; };
                } else {
                    game[m] = () => { calls[m]++; };
                }
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
