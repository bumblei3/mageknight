import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MineHandler } from '../../js/sites/MineHandler.js';

describe('MineHandler', () => {
    let handler;
    let mockGame;

    beforeEach(() => {
        mockGame = {
            hero: {
                movementPoints: 5,
                influencePoints: 10,
                crystals: { RED: 0, BLUE: 0, GREEN: 0, WHITE: 0 },
                gainCrystal: vi.fn()
            },
            addLog: vi.fn(),
            updateStats: vi.fn(),
            combatOrchestrator: {
                initiateCombat: vi.fn()
            },
            hexGrid: {
                axialToPixel: vi.fn().mockReturnValue({ x: 100, y: 100 })
            },
            particleSystem: {
                buffEffect: vi.fn()
            }
        };
        handler = new MineHandler(mockGame);
    });

    describe('getOptions', () => {
        it('should return collect crystal option for conquered mine', () => {
            const site = { conquered: true };
            const options = handler.getOptions(site, { q: 0, r: 0 });

            expect(options.length).toBe(1);
            expect(options[0].id).toBe('collect_crystal');

            // Directly test the action
            options[0].action();
            expect(mockGame.hero.gainCrystal).toHaveBeenCalled();
        });

        it('should return conquer option for unconquered mine', () => {
            const site = { conquered: false };
            const options = handler.getOptions(site, { q: 0, r: 0 });

            expect(options.length).toBe(1);
            expect(options[0].id).toBe('conquer_mine');

            // Directly test the action
            options[0].action();
            expect(mockGame.combatOrchestrator.initiateCombat).toHaveBeenCalled();
        });

        it('should disable crystal collection when no movement points', () => {
            mockGame.hero.movementPoints = 0;
            const site = { conquered: true };
            const options = handler.getOptions(site, { q: 0, r: 0 });

            expect(options[0].enabled).toBe(false);
        });

        it('should enable crystal collection when movement points available', () => {
            mockGame.hero.movementPoints = 1;
            const site = { conquered: true };
            const options = handler.getOptions(site, { q: 0, r: 0 });

            expect(options[0].enabled).toBe(true);
        });
    });

    describe('attackMine', () => {
        it('should initiate combat with mine guardian', () => {
            const result = handler.attackMine();

            expect(result.success).toBe(true);
            expect(mockGame.combatOrchestrator.initiateCombat).toHaveBeenCalled();
            expect(mockGame.addLog).toHaveBeenCalledWith(
                expect.stringContaining('Mine'),
                'warning'
            );
        });

        it('should spawn enemy with armor and attack stats', () => {
            handler.attackMine();

            const calledEnemy = mockGame.combatOrchestrator.initiateCombat.mock.calls[0][0];
            expect(calledEnemy.armor).toBeGreaterThan(0);
            expect(calledEnemy.attack).toBeGreaterThan(0);
            expect(calledEnemy.fame).toBeGreaterThan(0);
        });
    });

    describe('collectMineCrystal', () => {
        it('should grant crystal and deduct movement', () => {
            const hex = { q: 1, r: 0 };
            const result = handler.collectMineCrystal(hex);

            expect(result.success).toBe(true);
            expect(mockGame.hero.gainCrystal).toHaveBeenCalled();
            expect(mockGame.hero.movementPoints).toBe(4);
            expect(mockGame.addLog).toHaveBeenCalled();
        });

        it('should trigger particle effect when particleSystem exists', () => {
            const hex = { q: 1, r: 0 };
            handler.collectMineCrystal(hex);

            expect(mockGame.particleSystem.buffEffect).toHaveBeenCalled();
        });

        it('should fail when no movement points', () => {
            mockGame.hero.movementPoints = 0;
            const hex = { q: 1, r: 0 };
            const result = handler.collectMineCrystal(hex);

            expect(result.success).toBe(false);
            expect(mockGame.hero.gainCrystal).not.toHaveBeenCalled();
        });

        it('should grant a random color crystal', () => {
            const hex = { q: 1, r: 0 };

            // Run multiple times to verify randomness
            for (let i = 0; i < 10; i++) {
                mockGame.hero.movementPoints = 5; // Reset movement for each iteration
                handler.collectMineCrystal(hex);
            }

            expect(mockGame.hero.gainCrystal).toHaveBeenCalledTimes(10);

            // Verify all calls used valid colors
            const calls = mockGame.hero.gainCrystal.mock.calls;
            const validColors = ['red', 'green', 'blue', 'white'];
            calls.forEach(call => {
                expect(validColors).toContain(call[0]);
            });
        });
    });
});
