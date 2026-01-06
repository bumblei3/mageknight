import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionController } from '../js/interactionController.js';
import { TERRAIN_TYPES } from '../js/constants.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/game/Store.js';

describe('Movement Preview Logic', () => {
    let interactionController;
    let gameMock;
    let hexGridMock;

    beforeEach(() => {
        setLanguage('de');
        // Mock Game and HexGrid
        hexGridMock = {
            distance: vi.fn(),
            getMovementCost: vi.fn(),
            pixelToAxial: vi.fn(),
            getHex: vi.fn(),
            hasHex: vi.fn(),
            axialToPixel: vi.fn(() => ({ x: 0, y: 0 }))
        };

        gameMock = {
            hexGrid: hexGridMock,
            hero: {
                position: { q: 0, r: 0 },
                movementPoints: 2,
                hasSkill: vi.fn().mockReturnValue(false)
            },
            timeManager: {
                isNight: vi.fn().mockReturnValue(false)
            },
            ui: {
                tooltipManager: {
                    hideTooltip: vi.fn(),
                    createTerrainTooltipHTML: vi.fn(() => ''),
                    createSiteTooltipHTML: vi.fn(() => ''),
                    createEnemyTooltipHTML: vi.fn(() => ''),
                    showTooltip: vi.fn()
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

        document.body.innerHTML = `
            <div id="movement-preview" style="display: none;"></div>
            <div id="movement-preview-value"></div>
        `;
    });

    afterEach(() => {
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
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
        // JSDOM might not reflect var() in .style.color, limiting validation here.
        // Code path is verified by textContent and display checks.
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
        expect(valueEl.style.color).toBe('rgb(239, 68, 68)'); // Hex normalized to rgb
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
