import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VolkareController } from '../../js/game/VolkareController';
import { eventBus } from '../../js/eventBus';
import { GAME_EVENTS } from '../../js/constants';

describe('VolkareController', () => {
    let volkare;
    let mockGame;
    let mockHexGrid;

    beforeEach(() => {
        mockHexGrid = {
            findPath: vi.fn()
        };
        mockGame = {
            hexGrid: mockHexGrid
        };
        volkare = new VolkareController(mockGame);
        vi.spyOn(eventBus, 'emit');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize in inactive state', () => {
        expect(volkare.isActive).toBe(false);
        expect(volkare.position).toBeNull();
    });

    it('should spawn at specific hex', () => {
        const start = { q: -3, r: 0 };
        const target = { q: 2, r: 0 };
        volkare.spawn(start, target);

        expect(volkare.isActive).toBe(true);
        expect(volkare.position).toEqual(start);
        expect(volkare.target).toEqual(target);
        expect(eventBus.emit).toHaveBeenCalledWith(GAME_EVENTS.LOG_ADDED, expect.objectContaining({
            message: expect.stringContaining('Volkare')
        }));
    });

    it('should move one step on path', () => {
        const start = { q: 0, r: 0 };
        const next = { q: 1, r: -1 };
        const end = { q: 2, r: -2 };
        volkare.spawn(start, end);

        mockHexGrid.findPath.mockReturnValue([start, next, end]);

        volkare.move();

        expect(volkare.position).toEqual(next);
        expect(eventBus.emit).toHaveBeenCalledWith('VOLKARE_UPDATED', { position: next });
    });

    it('should not move if inactive', () => {
        volkare.isActive = false;
        volkare.move();
        expect(mockHexGrid.findPath).not.toHaveBeenCalled();
    });

    it('should emit critical log when target reached', () => {
        const target = { q: 5, r: 5 };
        volkare.spawn(target, target);

        // Directly call checkWinCondition as it's called by move()
        volkare.checkWinCondition();

        expect(eventBus.emit).toHaveBeenCalledWith(GAME_EVENTS.LOG_ADDED, expect.objectContaining({
            type: 'critical'
        }));
    });

    it('should trigger combat when catching Hero', () => {
        const hPos = { q: 1, r: -1 };
        mockGame.hero = { position: hPos };

        volkare.spawn({ q: 0, r: 0 }, { q: 2, r: 0 });
        volkare.position = hPos; // Simulate arriving at hero hex

        volkare.checkWinCondition();

        expect(eventBus.emit).toHaveBeenCalledWith('HERO_VOLKARE_COMBAT', expect.anything());
    });
});
