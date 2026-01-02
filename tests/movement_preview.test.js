import { describe, it, expect, beforeEach } from './testRunner.js';
import { InteractionController } from '../js/interactionController.js';
import { TERRAIN_TYPES } from '../js/constants.js';
import { createSpy } from './test-mocks.js';

describe('Movement Preview Logic', () => {
    let interactionController;
    let gameMock;
    let hexGridMock;

    beforeEach(() => {
        // Mock Game and HexGrid
        hexGridMock = {
            distance: createSpy(),
            getMovementCost: createSpy(),
            pixelToAxial: createSpy(),
            getHex: createSpy(),
            hasHex: createSpy(),
            axialToPixel: createSpy(() => ({ x: 0, y: 0 }))
        };

        gameMock = {
            hexGrid: hexGridMock,
            hero: {
                position: { q: 0, r: 0 },
                movementPoints: 2,
                hasSkill: createSpy().mockReturnValue ? createSpy().mockReturnValue(false) : (() => { const s = createSpy(); s.returnValue = false; return s; })()
            },
            timeManager: {
                isNight: createSpy().mockReturnValue ? createSpy().mockReturnValue(false) : (() => { const s = createSpy(); s.returnValue = false; return s; })()
            },
            ui: {
                tooltipManager: {
                    hideTooltip: createSpy(),
                    createTerrainTooltipHTML: createSpy(() => ''),
                    createSiteTooltipHTML: createSpy(() => ''),
                    createEnemyTooltipHTML: createSpy(() => ''),
                    showTooltip: createSpy()
                }
            },
            movementMode: true,
            // Add other required properties for InteractionController constructor/init
            canvas: {
                addEventListener: () => { },
                getBoundingClientRect: () => ({ left: 0, top: 0 })
            },
            enemies: []
        };

        // Fix for simple spy return value mocking
        gameMock.hero.hasSkill = () => false;
        gameMock.timeManager.isNight = () => false;

        interactionController = new InteractionController(gameMock);

        // Mock DOM elements
        document.body.innerHTML = `
            <div id="movement-preview" style="display: none;"></div>
            <div id="movement-preview-value"></div>
        `;
    });

    it('should show movement cost when hovering valid neighbor', () => {
        // Setup simple returns for spies
        hexGridMock.pixelToAxial = () => ({ q: 1, r: -1 });
        hexGridMock.getHex = () => ({ revealed: true, terrain: TERRAIN_TYPES.PLAINS });
        hexGridMock.distance = () => 1; // Adjacent
        hexGridMock.getMovementCost = () => 2;

        // Simulate Mouse Move
        const event = { clientX: 100, clientY: 100 };

        interactionController.handleCanvasMouseMove(event);

        const previewEl = document.getElementById('movement-preview');
        const valueEl = document.getElementById('movement-preview-value');

        expect(previewEl.style.display).toBe('flex');
        expect(valueEl.textContent).toBe('2');
        expect(valueEl.style.color).toBe('var(--color-accent-secondary)'); // Enough points (2 >= 2)
    });

    it('should show warning color if insufficient movement points', () => {
        // Hills cost 3, have 2
        hexGridMock.pixelToAxial = () => ({ q: 1, r: -1 });
        hexGridMock.getHex = () => ({ revealed: true, terrain: TERRAIN_TYPES.HILLS });
        hexGridMock.distance = () => 1;
        hexGridMock.getMovementCost = () => 3;

        interactionController.handleCanvasMouseMove({});

        const valueEl = document.getElementById('movement-preview-value');
        expect(valueEl.textContent).toBe('3');
        expect(valueEl.style.color).toBe('#ef4444'); // #ef4444 hex
    });

    it('should hide preview if distance is not 1 (not adjacent)', () => {
        hexGridMock.pixelToAxial = () => ({ q: 2, r: 0 }); // Far away
        hexGridMock.getHex = () => ({ revealed: true });
        hexGridMock.distance = () => 2;

        interactionController.handleCanvasMouseMove({});

        const previewEl = document.getElementById('movement-preview');
        expect(previewEl.style.display).toBe('none');
    });

    it('should hide preview if not in movement mode', () => {
        gameMock.movementMode = false;
        hexGridMock.pixelToAxial = () => ({ q: 0, r: 0 });

        interactionController.handleCanvasMouseMove({});

        const previewEl = document.getElementById('movement-preview');
        expect(previewEl.style.display).toBe('none');
    });
});
