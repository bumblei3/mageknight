import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeroSelectionModal } from '../../js/ui/HeroSelectionModal.js';

describe('HeroSelectionModal', () => {
    let modal;
    let mockUI;

    beforeEach(() => {
        // Setup JSDOM environment
        document.body.innerHTML = `
            <div id="hero-selection-modal" class="modal">
                <div class="modal-content">
                    <div id="hero-cards-grid"></div>
                </div>
            </div>
        `;

        mockUI = {
            game: {
                finishGameSetup: vi.fn()
            }
        };

        modal = new HeroSelectionModal(mockUI);
    });

    describe('Initialization', () => {
        it('should initialize correctly', () => {
            expect(modal.modal).toBeDefined();
            expect(modal.heroCardsGrid).toBeDefined();
            expect(modal.ui).toBe(mockUI);
        });

        it('should handle missing modal element gracefully', () => {
            document.body.innerHTML = '';
            const safeModal = new HeroSelectionModal(mockUI);
            expect(safeModal.modal).toBe(null);
        });
    });

    describe('show()', () => {
        it('should add show class to modal', () => {
            modal.show('test_scenario');
            expect(modal.modal.classList.contains('show')).toBe(true);
        });

        it('should store scenarioId', () => {
            modal.show('mining_expedition');
            expect(modal.selectedScenarioId).toBe('mining_expedition');
        });

        it('should render hero cards', () => {
            modal.show('test_scenario');
            const cards = document.querySelectorAll('.hero-card');
            expect(cards.length).toBe(4); // 4 heroes
        });
    });

    describe('hide()', () => {
        it('should remove show class from modal', () => {
            modal.show('test_scenario');
            modal.hide();
            expect(modal.modal.classList.contains('show')).toBe(false);
        });
    });

    describe('renderHeroes()', () => {
        it('should create cards for all heroes', () => {
            modal.renderHeroes();
            const cards = document.querySelectorAll('.hero-card');
            expect(cards.length).toBe(4);
        });

        it('should display hero names', () => {
            modal.renderHeroes();
            const names = document.querySelectorAll('.hero-info h3');
            const nameTexts = Array.from(names).map(n => n.textContent);
            expect(nameTexts).toContain('Goldyx');
            expect(nameTexts).toContain('Norowas');
            expect(nameTexts).toContain('Arythea');
            expect(nameTexts).toContain('Tovak');
        });

        it('should display hero stats', () => {
            modal.renderHeroes();
            const stats = document.querySelectorAll('.hero-stats');
            expect(stats.length).toBe(4);
        });
    });

    describe('Hero Selection', () => {
        it('should call finishGameSetup when hero card is clicked', () => {
            modal.show('test_scenario');
            const firstCard = document.querySelector('.hero-card');
            firstCard.click();

            expect(mockUI.game.finishGameSetup).toHaveBeenCalled();
        });

        it('should hide modal after selection', () => {
            modal.show('test_scenario');
            const firstCard = document.querySelector('.hero-card');
            firstCard.click();

            expect(modal.modal.classList.contains('show')).toBe(false);
        });

        it('should pass correct scenarioId to finishGameSetup', () => {
            modal.show('mines_freedom');
            const firstCard = document.querySelector('.hero-card');
            firstCard.click();

            expect(mockUI.game.finishGameSetup).toHaveBeenCalledWith(
                'mines_freedom',
                expect.any(String)
            );
        });
    });

    describe('Modal Interaction', () => {
        it('should hide when clicking outside modal content', () => {
            modal.show('test_scenario');

            // Simulate click on modal backdrop
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'target', { value: modal.modal });
            modal.modal.dispatchEvent(clickEvent);

            expect(modal.modal.classList.contains('show')).toBe(false);
        });
    });
});
