import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorldEventManager, EVENT_TYPES } from '../js/worldEvents.js';

describe('WorldEventManager - Coverage Boost', () => {
    let worldEvents;
    let mockGame;

    beforeEach(() => {
        mockGame = {
            hero: {
                healWound: vi.fn(),
                fame: 0
            },
            updateStats: vi.fn(),
            manaSource: {
                addCrystalToInventory: vi.fn()
            },
            renderMana: vi.fn(),
            addLog: vi.fn(),
            showToast: vi.fn(),
            combatOrchestrator: {
                initiateCombat: vi.fn()
            }
        };
        worldEvents = new WorldEventManager(mockGame);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('checkForEvent', () => {
        it('should return event for plains with low random', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
            
            const event = worldEvents.checkForEvent('plains');
            
            expect(event).not.toBeNull();
            expect(event.type).toBeDefined();
            spy.mockRestore();
        });

        it('should return null for plains with high random', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
            
            const event = worldEvents.checkForEvent('plains');
            
            expect(event).toBeNull();
            spy.mockRestore();
        });

        it('should return event for wasteland with higher threshold', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.15);
            
            const event = worldEvents.checkForEvent('wasteland');
            
            expect(event).not.toBeNull();
            spy.mockRestore();
        });

        it('should return null for wasteland with high random', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
            
            const event = worldEvents.checkForEvent('wasteland');
            
            expect(event).toBeNull();
            spy.mockRestore();
        });

        it('should return event for swamp with higher threshold', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.15);
            
            const event = worldEvents.checkForEvent('swamp');
            
            expect(event).not.toBeNull();
            spy.mockRestore();
        });

        it('should return event for desert with medium threshold', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.12);
            
            const event = worldEvents.checkForEvent('desert');
            
            expect(event).not.toBeNull();
            spy.mockRestore();
        });

        it('should return null for desert with high random', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
            
            const event = worldEvents.checkForEvent('desert');
            
            expect(event).toBeNull();
            spy.mockRestore();
        });
    });

    describe('generateEvent - dangerous terrain', () => {
        it('should generate ambush event when random > 0.5', () => {
            const spy = vi.spyOn(Math, 'random')
                .mockReturnValueOnce(0.6) // isDangerous check
                .mockReturnValueOnce(0.3); // benefits pick (not used for ambush)
            
            const event = worldEvents.generateEvent('wasteland');
            
            expect(event.type).toBe(EVENT_TYPES.AMBUSH);
            expect(event.options.length).toBe(2);
            expect(event.options[0].action).toBe('fight');
            expect(event.options[1].action).toBe('flee');
            spy.mockRestore();
        });

        it('should generate opportunity event when random <= 0.5', () => {
            const spy = vi.spyOn(Math, 'random')
                .mockReturnValueOnce(0.3) // isDangerous but not ambush
                .mockReturnValueOnce(0.2); // benefits pick
            
            const event = worldEvents.generateEvent('swamp');
            
            expect(event.type).toBe(EVENT_TYPES.OPPORTUNITY);
            expect(event.options.length).toBe(1);
            spy.mockRestore();
        });
    });

    describe('generateEvent - safe terrain', () => {
        it('should generate opportunity event for plains', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5); // benefits[1]
            
            const event = worldEvents.generateEvent('plains');
            
            expect(event.type).toBe(EVENT_TYPES.OPPORTUNITY);
            expect(event.options[0]).toBeDefined();
            spy.mockRestore();
        });

        it('should generate different opportunity events based on random', () => {
            // Test all three benefit options
            const spy0 = vi.spyOn(Math, 'random').mockReturnValue(0.0); // benefits[0] - heal
            const event0 = worldEvents.generateEvent('plains');
            expect(event0.options[0].action).toBe('heal');
            spy0.mockRestore();

            const spy1 = vi.spyOn(Math, 'random').mockReturnValue(0.5); // benefits[1] - mana
            const event1 = worldEvents.generateEvent('plains');
            expect(event1.options[0].action).toBe('mana');
            spy1.mockRestore();

            const spy2 = vi.spyOn(Math, 'random').mockReturnValue(0.9); // benefits[2] - motivation
            const event2 = worldEvents.generateEvent('plains');
            expect(event2.options[0].action).toBe('motivation');
            spy2.mockRestore();
        });
    });

    describe('triggerEvent', () => {
        it('should show toast when showToast exists', () => {
            worldEvents.triggerEvent('TEST_EVENT', { data: 'test' });
            
            expect(mockGame.showToast).toHaveBeenCalledWith('Ereignis: TEST_EVENT', 'info');
        });

        it('should not throw when showToast is missing', () => {
            const eventsNoToast = new WorldEventManager({ ...mockGame, showToast: undefined });
            
            expect(() => eventsNoToast.triggerEvent('TEST_EVENT')).not.toThrow();
        });
    });

    describe('resolveEventOption', () => {
        it('should heal wound when option is heal', () => {
            const event = { options: [{ action: 'heal', value: 1 }] };
            
            worldEvents.resolveEventOption(event, 0);
            
            expect(mockGame.hero.healWound).toHaveBeenCalledWith(false);
            expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('geheilt'), 'success');
        });

        it('should add mana when option is mana', () => {
            const event = { options: [{ action: 'mana', value: 'red' }] };
            
            worldEvents.resolveEventOption(event, 0);
            
            expect(mockGame.manaSource.addCrystalToInventory).toHaveBeenCalledWith('red');
            expect(mockGame.renderMana).toHaveBeenCalled();
        });

        it('should do nothing for fight action (placeholder)', () => {
            const event = { options: [{ action: 'fight', value: 'orc' }] };
            
            expect(() => worldEvents.resolveEventOption(event, 0)).not.toThrow();
        });

        it('should do nothing for flee action (placeholder)', () => {
            const event = { options: [{ action: 'flee', value: 1 }] };
            
            expect(() => worldEvents.resolveEventOption(event, 0)).not.toThrow();
        });

        it('should do nothing for invalid option index', () => {
            const event = { options: [] };
            
            expect(() => worldEvents.resolveEventOption(event, 5)).not.toThrow();
        });

        it('should do nothing if hero missing for heal', () => {
            mockGame.hero = null;
            const event = { options: [{ action: 'heal', value: 1 }] };
            
            expect(() => worldEvents.resolveEventOption(event, 0)).not.toThrow();
        });

        it('should do nothing if manaSource missing for mana', () => {
            mockGame.manaSource = null;
            const event = { options: [{ action: 'mana', value: 'red' }] };
            
            expect(() => worldEvents.resolveEventOption(event, 0)).not.toThrow();
        });
    });

    describe('getRandomEvent', () => {
        it('should generate event with plains terrain', () => {
            const event = worldEvents.getRandomEvent();
            
            expect(event.type).toBe(EVENT_TYPES.OPPORTUNITY);
            expect(event.options.length).toBe(1);
        });
    });

    describe('onTileRevealed - Spawning Grounds', () => {
        it('should auto-spawn enemies for unconquered spawning grounds', () => {
            const tileData = { 
                site: { 
                    type: 'spawning_grounds', 
                    conquered: false 
                } 
            };
            
            // Mock Math.random for deterministic spawn
            const spy = vi.spyOn(Math, 'random')
                .mockReturnValueOnce(0.3) // spawnCount = 1 (0.3 <= 0.5)
                .mockReturnValueOnce(0.3) // enemyType = rat (0.3 <= 0.5)
                .mockReturnValueOnce(0.3); // isElite = false
            
            worldEvents.onTileRevealed(0, 0, tileData);
            
            expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('Brutstätte'), 'warning');
            expect(mockGame.combatOrchestrator.initiateCombat).toHaveBeenCalled();
            
            const enemies = mockGame.combatOrchestrator.initiateCombat.mock.calls[0][0];
            expect(enemies.length).toBe(1);
            expect(enemies[0].type).toBe('rat');
            
            spy.mockRestore();
        });

        it('should spawn 2 enemies when random > 0.5', () => {
            const tileData = { 
                site: { 
                    type: 'spawning_grounds', 
                    conquered: false 
                } 
            };
            
            const spy = vi.spyOn(Math, 'random')
                .mockReturnValueOnce(0.8) // spawnCount = 2
                .mockReturnValueOnce(0.8) // enemyType = orc (first)
                .mockReturnValueOnce(0.3) // isElite = false (first)
                .mockReturnValueOnce(0.8) // enemyType = orc (second)
                .mockReturnValueOnce(0.9); // isElite = true (second)
            
            worldEvents.onTileRevealed(0, 0, tileData);
            
            const enemies = mockGame.combatOrchestrator.initiateCombat.mock.calls[0][0];
            expect(enemies.length).toBe(2);
            // First enemy: orc, not elite
            expect(enemies[0].type).toBe('orc');
            // Second enemy: orc, elite
            expect(enemies[1].type).toBe('orc_elite');
            
            spy.mockRestore();
        });

        it('should not spawn for conquered spawning grounds', () => {
            const tileData = { 
                site: { 
                    type: 'spawning_grounds', 
                    conquered: true 
                } 
            };
            
            worldEvents.onTileRevealed(0, 0, tileData);
            
            expect(mockGame.combatOrchestrator.initiateCombat).not.toHaveBeenCalled();
        });

        it('should not spawn for non-spawning grounds site', () => {
            const tileData = { 
                site: { 
                    type: 'keep', 
                    conquered: false 
                } 
            };
            
            worldEvents.onTileRevealed(0, 0, tileData);
            
            expect(mockGame.combatOrchestrator.initiateCombat).not.toHaveBeenCalled();
        });

        it('should not spawn if no site data', () => {
            const tileData = {};
            
            worldEvents.onTileRevealed(0, 0, tileData);
            
            expect(mockGame.combatOrchestrator.initiateCombat).not.toHaveBeenCalled();
        });

        it('should not spawn if site is null', () => {
            const tileData = { site: null };
            
            worldEvents.onTileRevealed(0, 0, tileData);
            
            expect(mockGame.combatOrchestrator.initiateCombat).not.toHaveBeenCalled();
        });
    });
});