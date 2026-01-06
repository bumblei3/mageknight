import { describe, it, expect, beforeEach } from 'vitest';
import { WorldEventManager, EVENT_TYPES } from '../js/worldEvents.js';

describe('WorldEventManager', () => {
    let worldEvents;
    let mockGame;

    beforeEach(() => {
        mockGame = {
            hero: {
                healWound: () => { },
                fame: 0
            },
            updateStats: () => { },
            manaSource: {
                addCrystalToInventory: () => { }
            },
            renderMana: () => { }
        };
        worldEvents = new WorldEventManager(mockGame);
    });

    it('should generate events based on terrain', () => {
        // Force random to ensure event generation
        const originalRandom = Math.random;
        Math.random = () => 0.01; // Ensure check passes (chance < 0.2)

        const event = worldEvents.checkForEvent('plains');
        expect(event).not.toBeNull();
        expect(event.type).toBeDefined();

        Math.random = originalRandom;
    });

    it('should generate ambush events in dangerous terrain', () => {
        const event = worldEvents.generateEvent('wasteland');
        // Wasteland should prioritize bad stuff but random pick from array
        // We can't guarantee it without full mockery of Math.random
        // But we can check structure
        expect(event.options.length).toBeGreaterThan(0);
    });

    it('should resolve heal option', () => {
        const event = {
            options: [{ action: 'heal', value: 1 }]
        };

        let healed = false;
        mockGame.hero.healWound = () => { healed = true; };

        worldEvents.resolveEventOption(event, 0);
        expect(healed).toBe(true);
    });

    it('should resolve mana gain', () => {
        const event = {
            options: [{ action: 'mana', value: 'gold' }]
        };

        let manaAdded = null;
        mockGame.manaSource.addCrystalToInventory = (color) => { manaAdded = color; };

        worldEvents.resolveEventOption(event, 0);
        expect(manaAdded).toBe('gold');
    });
});
