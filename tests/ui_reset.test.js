import { describe, it, expect, beforeEach } from './testRunner.js';
import UI from '../js/ui.js';

describe('UI Reset', () => {
    let ui;

    beforeEach(() => {
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
