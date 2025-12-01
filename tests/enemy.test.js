import { describe, it, expect } from './testRunner.js';
import { Enemy, ENEMY_TYPES, createEnemy, ENEMY_DEFINITIONS } from '../js/enemy.js';

describe('Enemy System', () => {
    it('should create an enemy with correct properties', () => {
        const enemy = new Enemy({
            type: ENEMY_TYPES.ORC,
            name: 'Test Orc',
            armor: 3,
            attack: 2,
            fame: 2
        });

        expect(enemy.name).toBe('Test Orc');
        expect(enemy.armor).toBe(3);
        expect(enemy.attack).toBe(2);
        expect(enemy.fame).toBe(2);
        expect(enemy.isDefeated(2)).toBe(false);
        expect(enemy.isDefeated(3)).toBe(true);
    });

    it('should handle brutal ability', () => {
        const enemy = new Enemy({
            name: 'Brutal Orc',
            attack: 3,
            brutal: true
        });

        expect(enemy.getEffectiveAttack()).toBe(6);
    });

    it('should handle swift ability', () => {
        const enemy = new Enemy({
            name: 'Swift Orc',
            attack: 3,
            swift: true
        });

        expect(enemy.getBlockRequirement()).toBe(6);
    });

    it('should clone enemy', () => {
        const original = new Enemy({
            name: 'Original',
            armor: 5,
            fireResist: true
        });

        const clone = original.clone();

        expect(clone.name).toBe('Original');
        expect(clone.armor).toBe(5);
        expect(clone.fireResist).toBe(true);
        expect(clone === original).toBe(false);
    });

    it('should create enemy from factory', () => {
        const orc = createEnemy(ENEMY_TYPES.ORC);

        expect(orc).toBeDefined();
        expect(orc.type).toBe(ENEMY_TYPES.ORC);
        expect(orc.name).toBe(ENEMY_DEFINITIONS[ENEMY_TYPES.ORC].name);
    });

    it('should return null for unknown enemy type', () => {
        const unknown = createEnemy('unknown_type');
        expect(unknown).toBeNull();
    });

    it('should create enemy with position', () => {
        const pos = { q: 1, r: -1 };
        const orc = createEnemy(ENEMY_TYPES.ORC, pos);

        expect(orc.position).toEqual(pos);
    });

    it('should have correct resistances', () => {
        const draconum = createEnemy(ENEMY_TYPES.DRACONUM);

        expect(draconum.fireResist).toBe(true);
        expect(draconum.iceResist).toBe(false); // Default false
    });
});
