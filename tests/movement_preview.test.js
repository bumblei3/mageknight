import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionController } from '../js/interactionController.js';
import { TERRAIN_TYPES } from '../js/constants.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/store.js';

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
            axialToPixel: vi.fn(() => ({ x: 0, y: 0 })),
            // Movement preview hooks — InteractionController calls these
            getPathWithinMovement: vi.fn(() => null),
            setPathPreview: vi.fn(),
            clearPathPreview: vi.fn()
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
            reachableHexes: [],
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

    it('should show movement cost when hovering a reachable hex', () => {
        // Setup a reachable hex — the preview logic checks reachableHexes first
        hexGridMock.pixelToAxial = () => ({ q: 1, r: -1 });
        hexGridMock.getHex = () => ({ revealed: true, terrain: TERRAIN_TYPES.PLAINS });

        // InteractionController.updateMovementPathPreview checks reachableHexes first;
        // when there a hit with cost info, it uses that instead of getPathWithinMovement.
        gameMock.reachableHexes = [{ q: 1, r: -1, cost: 2 }];

        // Simulate Mouse Move
        const event = { clientX: 100, clientY: 100 };

        interactionController.handleCanvasMouseMove(event);

        const previewEl = document.getElementById('movement-preview');
        const valueEl = document.getElementById('movement-preview-value');

        expect(previewEl.style.display).toBe('flex');
        expect(valueEl.textContent).toBe('2');
    });

    it('should show warning color if insufficient movement points', () => {
        // Hills cost 3, have 2 — reachableHexes supplies cost
        hexGridMock.pixelToAxial = () => ({ q: 1, r: -1 });
        hexGridMock.getHex = () => ({ revealed: true, terrain: TERRAIN_TYPES.HILLS });
        gameMock.reachableHexes = [{ q: 1, r: -1, cost: 3 }];

        interactionController.handleCanvasMouseMove({});

        const valueEl = document.getElementById('movement-preview-value');
        expect(valueEl.textContent).toBe('3');
        // JSDOM normalizes hex colors to rgb — #ef4444 → rgb(239, 68, 68)
        expect(valueEl.style.color).toBe('rgb(239, 68, 68)');
    });

    it('should hide preview if not in movement mode', () => {
        gameMock.movementMode = false;
        hexGridMock.pixelToAxial = () => ({ q: 0, r: 0 });

        interactionController.handleCanvasMouseMove({});

        const previewEl = document.getElementById('movement-preview');
        expect(previewEl.style.display).toBe('none');
    });
});
