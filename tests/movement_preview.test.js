import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractionController } from '../js/interactionController.js';
import { HexGrid } from '../js/hexgrid.js';
import { TERRAIN_TYPES } from '../js/constants.js';

describe('Movement Preview Logic', () => {
    let interactionController;
    let gameMock;
    let hexGridMock;

    beforeEach(() => {
        // Mock Game and HexGrid
        hexGridMock = {
            distance: vi.fn(),
            getMovementCost: vi.fn(),
            pixelToAxial: vi.fn(),
            getHex: vi.fn(),
            hasHex: vi.fn()
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
                    hideTooltip: vi.fn()
                }
            },
            movementMode: true
        };

        interactionController = new InteractionController(gameMock);

        // Mock DOM elements
        document.body.innerHTML = `
            <div id="movement-preview" style="display: none;"></div>
            <div id="movement-preview-value"></div>
        `;
    });

    it('should show movement cost when hovering valid neighbor', () => {
        // Setup
        hexGridMock.pixelToAxial.mockReturnValue({ q: 1, r: -1 });
        hexGridMock.getHex.mockReturnValue({ revealed: true, terrain: TERRAIN_TYPES.PLAINS });
        hexGridMock.distance.mockReturnValue(1); // Adjacent
        hexGridMock.getMovementCost.mockReturnValue(2);

        // Simulate Mouse Move
        const event = { clientX: 100, clientY: 100 };
        // We need to mock getBoundingClientRect for canvas if used, 
        // but handleCanvasMouseMove uses it. Let's patch game.canvas
        gameMock.canvas = {
            getBoundingClientRect: () => ({ left: 0, top: 0 })
        };

        interactionController.handleCanvasMouseMove(event);

        const previewEl = document.getElementById('movement-preview');
        const valueEl = document.getElementById('movement-preview-value');

        expect(previewEl.style.display).toBe('flex');
        expect(valueEl.textContent).toBe('2');
        expect(valueEl.style.color).toBe('var(--color-accent-secondary)'); // Enough points (2 >= 2)
    });

    it('should show warning color if insufficient movement points', () => {
        // Hills cost 3, have 2
        hexGridMock.pixelToAxial.mockReturnValue({ q: 1, r: -1 });
        hexGridMock.getHex.mockReturnValue({ revealed: true, terrain: TERRAIN_TYPES.HILLS });
        hexGridMock.distance.mockReturnValue(1);
        hexGridMock.getMovementCost.mockReturnValue(3);

        gameMock.canvas = { getBoundingClientRect: () => ({ left: 0, top: 0 }) };

        interactionController.handleCanvasMouseMove({}); // Event doesn't matter much with mocks returning constant

        const valueEl = document.getElementById('movement-preview-value');
        expect(valueEl.textContent).toBe('3');
        expect(valueEl.style.color).toBe('rgb(239, 68, 68)'); // #ef4444 hex to rgb
    });

    it('should hide preview if distance is not 1 (not adjacent)', () => {
        hexGridMock.pixelToAxial.mockReturnValue({ q: 2, r: 0 }); // Far away
        hexGridMock.getHex.mockReturnValue({ revealed: true });
        hexGridMock.distance.mockReturnValue(2);

        gameMock.canvas = { getBoundingClientRect: () => ({ left: 0, top: 0 }) };

        interactionController.handleCanvasMouseMove({});

        const previewEl = document.getElementById('movement-preview');
        expect(previewEl.style.display).toBe('none');
    });

    it('should hide preview if not in movement mode', () => {
        gameMock.movementMode = false;

        interactionController.handleCanvasMouseMove({});

        const previewEl = document.getElementById('movement-preview');
        expect(previewEl.style.display).toBe('none');
    });
});
