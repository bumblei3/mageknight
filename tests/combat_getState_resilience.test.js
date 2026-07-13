/**
 * Combat.getState() data-integrity test (foundation hardening).
 * Combat.getState() serializes `this.enemies` via `.map(e => e.getState())`.
 * A null entry in the enemy list (corrupt combat state) crashed with
 * TypeError: reading 'getState' of null. Same data-integrity class as the
 * GameStateManager getGameState fixes. This locks the behavior.
 */
import { describe, it, expect } from 'vitest';
import { Combat } from '../js/combat.js';
import { Hero } from '../js/hero.js';

class MockEnemy {
    constructor(id) {
        this.id = id;
        this.name = 'Mock Enemy';
        this.armor = 3;
        this.attack = 2;
    }
    getState() {
        return { id: this.id, name: this.name, armor: this.armor, attack: this.attack };
    }
}

describe('Combat.getState - corrupt enemy list resilience', () => {
    it('does not crash on a null entry in enemies (corrupt combat state)', () => {
        const hero = new Hero('TestHero');
        const enemy = new MockEnemy('e1');
        const combat = new Combat(hero, [enemy]);
        // Inject a corrupt null entry into the live enemy list
        combat.enemies = [enemy, null];

        let state;
        expect(() => { state = combat.getState(); }).not.toThrow();
        // The null entry is skipped; the real enemy is serialized.
        expect(state.enemies).toHaveLength(1);
        expect(state.enemies[0].id).toBe('e1');
    });

    it('serializes a normal enemy list unchanged', () => {
        const hero = new Hero('TestHero');
        const e1 = new MockEnemy('e1');
        const e2 = new MockEnemy('e2');
        const combat = new Combat(hero, [e1, e2]);
        const state = combat.getState();
        expect(state.enemies).toHaveLength(2);
        expect(state.enemies.map(e => e.id)).toEqual(['e1', 'e2']);
    });
});
