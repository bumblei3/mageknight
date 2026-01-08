import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderController } from '../../js/game/RenderController';
import { t } from '../../js/i18n/index';

describe('RenderController', () => {
    let controller;
    let mockGame;
    let mockUI;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="phase-indicator">
                <span class="phase-text"></span>
                <span id="phase-hint"></span>
            </div>
            <button id="explore-btn"></button>
            <button id="visit-btn" style="display: none;"></button>
            <div id="achievements-list"></div>
            <div id="statistics-grid"></div>
        `;

        mockUI = {
            updateHeroStats: vi.fn(),
            updateMovementPoints: vi.fn(),
            renderUnits: vi.fn(),
            setButtonEnabled: vi.fn(),
            elements: {
                exploreBtn: document.getElementById('explore-btn')
            }
        };

        mockGame = {
            ui: mockUI,
            hero: {
                position: { q: 0, r: 0 },
                movementPoints: 5,
                units: [],
                fame: 10,
                wounds: [],
                deck: [], hand: [], discard: []
            },
            mapManager: {
                canExplore: vi.fn().mockReturnValue(true)
            },
            hexGrid: {
                getHex: vi.fn().mockReturnValue({ site: null })
            },
            timeManager: {
                isNight: vi.fn().mockReturnValue(false)
            },
            interactionController: {
                handleCardClick: vi.fn(),
                handleCardRightClick: vi.fn()
            },
            combat: null,
            movementMode: false
        };

        controller = new RenderController(mockGame);
    });

    it('should update stats and enable explore button', () => {
        controller.updateStats();

        expect(mockUI.updateHeroStats).toHaveBeenCalled();
        expect(mockUI.updateMovementPoints).toHaveBeenCalledWith(5);
        expect(mockUI.setButtonEnabled).toHaveBeenCalledWith(mockUI.elements.exploreBtn, true);
    });

    it('should show visit button when on site', () => {
        const mockSite = { getName: () => 'Village' };
        mockGame.hexGrid.getHex.mockReturnValue({ site: mockSite });

        controller.updateStats();

        const visitBtn = document.getElementById('visit-btn');
        expect(visitBtn.style.display).not.toBe('none');
        expect(visitBtn.textContent).toContain('Village');
    });

    it('should update phase indicator for exploration', () => {
        controller.updatePhaseIndicator();
        expect(document.querySelector('.phase-text').textContent).toBe(t('ui.phases.exploration'));
    });
});
