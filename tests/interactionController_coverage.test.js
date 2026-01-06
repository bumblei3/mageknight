
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionController } from '../js/interactionController.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/game/Store.js';

describe('InteractionController Coverage', () => {
    let controller;
    let mockGame;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = '<canvas id="game-board"></canvas>';
        const canvas = document.getElementById('game-board');
        canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });

        mockGame = {
            canvas: canvas,
            hexGrid: {
                pixelToAxial: vi.fn(() => ({ q: 0, r: 0 })),
                hasHex: vi.fn(() => true),
                getHex: vi.fn(() => ({ revealed: true, terrain: 'plains' })),
                axialToPixel: vi.fn(() => ({ x: 400, y: 300 }))
            },
            hero: {
                position: { q: 0, r: 0 },
                displayPosition: { q: 0, r: 0 }
            },
            enemies: [],
            ui: {
                tooltipManager: {
                    hideTooltip: vi.fn(),
                    showTooltip: vi.fn(),
                    createTerrainTooltipHTML: vi.fn(() => '<div>Terrain</div>'),
                    createEnemyTooltipHTML: vi.fn(() => '<div>Enemy</div>'),
                    createSiteTooltipHTML: vi.fn(() => '<div>Site</div>')
                }
            },
            movementMode: false,
            render: vi.fn(),
            addLog: vi.fn(),
            moveHero: vi.fn()
        };

        controller = new InteractionController(mockGame);
    });

    afterEach(() => {
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('handleCanvasClick', () => {
        it('should do nothing if hex does not exist', () => {
            mockGame.hexGrid.hasHex = vi.fn(() => false);

            controller.handleCanvasClick({ clientX: 100, clientY: 100 });

            expect(mockGame.moveHero).not.toHaveBeenCalled();
        });

        it('should call moveHero in movement mode', () => {
            mockGame.movementMode = true;

            controller.handleCanvasClick({ clientX: 100, clientY: 100 });

            expect(mockGame.moveHero).toHaveBeenCalled();
        });

        it('should handle debug teleport', () => {
            mockGame.debugTeleport = true;

            controller.handleCanvasClick({ clientX: 100, clientY: 100 });

            expect(mockGame.render).toHaveBeenCalled();
            expect(mockGame.debugTeleport).toBe(false);
        });
    });

    describe('handleCanvasMouseMove', () => {
        it('should hide tooltip when no hex found', () => {
            mockGame.hexGrid.pixelToAxial = vi.fn(() => null);

            controller.handleCanvasMouseMove({ clientX: 100, clientY: 100 });

            expect(mockGame.ui.tooltipManager.hideTooltip).toHaveBeenCalled();
        });

        it('should show terrain tooltip for revealed hex', () => {
            controller.handleCanvasMouseMove({ clientX: 100, clientY: 100 });

            expect(mockGame.ui.tooltipManager.showTooltip).toHaveBeenCalled();
        });
    });
});
