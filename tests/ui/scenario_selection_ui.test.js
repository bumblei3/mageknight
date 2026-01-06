import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScenarioSelectionModal } from '../../js/ui/ScenarioSelectionModal.js';

describe('ScenarioSelectionModal', () => {
    let game;
    let modal;

    beforeEach(() => {
        // Setup JSDOM environment
        document.body.innerHTML = `
            <div id="scenario-selection-modal" class="modal">
                <div class="modal-content">
                    <span class="modal-close" id="scenario-selection-close">&times;</span>
                    <div id="scenario-cards-grid"></div>
                    <button id="scenario-cancel-btn">Abbrechen</button>
                </div>
            </div>
        `;

        game = {
            scenarioManager: {
                scenarios: {
                    's1': { id: 's1', name: 'Scenario 1', description: 'Desc 1' },
                    's2': { id: 's2', name: 'Scenario 2', description: 'Desc 2' }
                },
                getObjectivesTextForScenario: vi.fn().mockReturnValue('Objectives')
            },
            startNewGame: vi.fn(),
            reset: vi.fn()
        };

        modal = new ScenarioSelectionModal(game);
    });

    it('should initialize correctly', () => {
        expect(modal.modal).toBeDefined();
        expect(modal.cardsGrid).toBeDefined();
    });

    it('should render scenario cards', () => {
        modal.show();
        const cards = document.querySelectorAll('.scenario-card');
        expect(cards.length).toBe(2);
        expect(cards[0].querySelector('h3').textContent).toBe('Scenario 1');
        expect(cards[1].querySelector('h3').textContent).toBe('Scenario 2');
    });

    it('should call startNewGame when a card is clicked', () => {
        modal.show();
        const firstCard = document.querySelector('.scenario-card');
        firstCard.click();

        expect(game.startNewGame).toHaveBeenCalledWith('s1');
        expect(modal.modal.classList.contains('show')).toBe(false);
    });

    it('should hide when close button is clicked', () => {
        modal.show();
        expect(modal.modal.classList.contains('show')).toBe(true);

        document.getElementById('scenario-selection-close').click();
        expect(modal.modal.classList.contains('show')).toBe(false);
    });

    it('should hide when cancel button is clicked', () => {
        modal.show();
        document.getElementById('scenario-cancel-btn').click();
        expect(modal.modal.classList.contains('show')).toBe(false);
    });
});
