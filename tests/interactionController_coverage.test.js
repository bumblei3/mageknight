
import { describe, it, expect, beforeEach } from './testRunner.js';
import { InteractionController } from '../js/interactionController.js';
import { setupGlobalMocks, resetMocks, setupStandardGameDOM, createSpy, createMockCanvas } from './test-mocks.js';

setupGlobalMocks();

describe('InteractionController Coverage', () => {
    let controller;
    let mockGame;

    beforeEach(() => {
        setupStandardGameDOM();
        resetMocks();

        const mockCanvas = createMockCanvas(800, 600);

        mockGame = {
            canvas: mockCanvas,
            hexGrid: {
                pixelToAxial: createSpy(() => ({ q: 0, r: 0 })),
                hasHex: createSpy(() => true),
                getHex: createSpy(() => ({ revealed: true, terrain: 'plains' })),
                axialToPixel: createSpy(() => ({ x: 400, y: 300 }))
            },
            hero: {
                position: { q: 0, r: 0 },
                displayPosition: { q: 0, r: 0 }
            },
            enemies: [],
            ui: {
                tooltipManager: {
                    hideTooltip: createSpy(),
                    showTooltip: createSpy(),
                    createTerrainTooltipHTML: createSpy(() => '<div>Terrain</div>'),
                    createEnemyTooltipHTML: createSpy(() => '<div>Enemy</div>'),
                    createSiteTooltipHTML: createSpy(() => '<div>Site</div>')
                }
            },
            movementMode: false,
            debugTeleport: false,
            render: createSpy(),
            addLog: createSpy(),
            moveHero: createSpy()
        };

        controller = new InteractionController(mockGame);
    });

    describe('handleCanvasClick', () => {
        it('should do nothing if hex does not exist', () => {
            mockGame.hexGrid.hasHex = createSpy(() => false);

            controller.handleCanvasClick({ clientX: 100, clientY: 100 });

            expect(mockGame.moveHero.called).toBe(false);
        });

        it('should call moveHero in movement mode', () => {
            mockGame.movementMode = true;

            controller.handleCanvasClick({ clientX: 100, clientY: 100 });

            expect(mockGame.moveHero.called).toBe(true);
        });

        it('should handle debug teleport', () => {
            mockGame.debugTeleport = true;

            controller.handleCanvasClick({ clientX: 100, clientY: 100 });

            expect(mockGame.render.called).toBe(true);
            expect(mockGame.debugTeleport).toBe(false);
        });
    });

    describe('handleCanvasMouseMove', () => {
        it('should hide tooltip when no hex found', () => {
            mockGame.hexGrid.pixelToAxial = createSpy(() => null);

            controller.handleCanvasMouseMove({ clientX: 100, clientY: 100 });

            expect(mockGame.ui.tooltipManager.hideTooltip.called).toBe(true);
        });

        it('should show terrain tooltip for revealed hex', () => {
            controller.handleCanvasMouseMove({ clientX: 100, clientY: 100 });

            expect(mockGame.ui.tooltipManager.showTooltip.called).toBe(true);
        });
    });
});
