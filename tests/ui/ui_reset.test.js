import { describe, it, expect, beforeEach } from 'vitest';
import UI from '../../js/ui.js';

describe('UI Reset', () => {
    let ui;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="hand-cards"></div>
            <div id="played-cards"></div>
            <div id="hero-units"></div>
            <div id="play-area"></div>
            <div id="game-log"></div>
            <div id="fame-value">0</div>
            <div id="reputation-value">0</div>
            <div id="hero-armor">2</div>
            <div id="hero-handlimit">5</div>
            <div id="hero-wounds">0</div>
            <div id="movement-points">0</div>
            <div id="mana-source"></div>
            <div id="hero-mana"></div>
            <button id="heal-btn" style="display: none"></button>
        `;
        ui = new UI();
    });

    it('should clear all UI elements on reset()', () => {
        // Setup some state
        ui.elements.handCards.innerHTML = '<div>Card</div>';
        ui.elements.playedCards.innerHTML = '<div>Played</div>';
        ui.elements.heroUnits.innerHTML = '<div>Unit</div>';
        ui.elements.fameValue.textContent = '10';

        ui.reset();

        expect(ui.elements.handCards.innerHTML).toBe('');
        expect(ui.elements.playedCards.innerHTML).toBe('');
        expect(ui.elements.heroUnits.innerHTML).toBe('');
        expect(ui.elements.fameValue.textContent).toBe('0');
        expect(ui.elements.heroArmor.textContent).toBe('2');
    });
});
