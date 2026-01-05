import { describe, it, expect, beforeEach, afterEach } from '../testRunner.js';
import { MageKnightGame } from '../../js/game.js';
import { createEnemy } from '../../js/enemy.js';
import { ATTACK_ELEMENTS, COMBAT_PHASES } from '../../js/constants.js';
import Combat from '../../js/combat.js'; // Import default export
import {
    createMockWindow,
    createMockDocument,
    resetMocks
} from '../test-mocks.js';

describe('Elemental Combat', () => {
    let game;

    beforeEach(() => {
        document.body.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.id = 'game-board';
        document.body.appendChild(canvas);
        game = new MageKnightGame();

        // Setup simple combat state
        game.combat = {
            phase: COMBAT_PHASES.BLOCK,
            blockedEnemies: new Set(),
            unitBlockPoints: 0,
            blockEnemy: game.combat ? game.combat.blockEnemy : null
        };
    });

    afterEach(() => {
        resetMocks();
    });

    it('should block Physical Attack efficiently (1:1)', () => {
        // Physical Enemy (Attack 3)
        const enemy = createEnemy('orc');
        enemy.attack = 3;
        enemy.attackType = ATTACK_ELEMENTS.PHYSICAL;

        const combat = new Combat(game.hero, [enemy]);
        combat.phase = COMBAT_PHASES.BLOCK;

        // Block with Physical 3
        const result = combat.blockEnemy(enemy, [{ value: 3, element: ATTACK_ELEMENTS.PHYSICAL }]);

        expect(result.success).toBe(true);
        expect(result.blocked).toBe(true);
        expect(result.totalBlock).toBe(3);
        expect(result.isInefficient).toBe(false);
    });

    it('should block Fire Attack inefficiently with Physical (2:1)', () => {
        // Fire Enemy (Attack 3)
        const enemy = createEnemy('orc');
        enemy.attack = 3;
        enemy.attackType = ATTACK_ELEMENTS.FIRE;

        const combat = new Combat(game.hero, [enemy]);
        combat.phase = COMBAT_PHASES.BLOCK;

        // Block with Physical 4 -> Effective 2 (Fail)
        let result = combat.blockEnemy(enemy, [{ value: 4, element: ATTACK_ELEMENTS.PHYSICAL }]);
        expect(result.blocked).toBe(false);
        expect(result.totalBlock).toBe(2);
        expect(result.isInefficient).toBe(true);

        // Block with Physical 6 -> Effective 3 (Success)
        combat.blockedEnemies.clear();
        result = combat.blockEnemy(enemy, [{ value: 6, element: ATTACK_ELEMENTS.PHYSICAL }]);
        expect(result.blocked).toBe(true);
        expect(result.totalBlock).toBe(3);
    });

    it('should block Fire Attack efficiently with Ice (1:1)', () => {
        const enemy = createEnemy('orc');
        enemy.attack = 3;
        enemy.attackType = ATTACK_ELEMENTS.FIRE;

        const combat = new Combat(game.hero, [enemy]);
        combat.phase = COMBAT_PHASES.BLOCK;

        // Block with Ice 3 -> Effective 3 (Success)
        const result = combat.blockEnemy(enemy, [{ value: 3, element: ATTACK_ELEMENTS.ICE }]);
        expect(result.blocked).toBe(true);
        expect(result.totalBlock).toBe(3);
        expect(result.isInefficient).toBe(false);
    });

    it('should block Ice Attack efficiently with Fire (1:1)', () => {
        const enemy = createEnemy('orc');
        enemy.attack = 3;
        enemy.attackType = ATTACK_ELEMENTS.ICE;

        const combat = new Combat(game.hero, [enemy]);
        combat.phase = COMBAT_PHASES.BLOCK;

        // Block with Fire 3 -> Effective 3 (Success)
        const result = combat.blockEnemy(enemy, [{ value: 3, element: ATTACK_ELEMENTS.FIRE }]);
        expect(result.blocked).toBe(true);
        expect(result.totalBlock).toBe(3);
    });

    it('should handle Cold Fire complexity (Ice/Fire = Inefficient)', () => {
        const enemy = createEnemy('orc');
        enemy.attack = 4;
        enemy.attackType = ATTACK_ELEMENTS.COLD_FIRE;

        const combat = new Combat(game.hero, [enemy]);
        combat.phase = COMBAT_PHASES.BLOCK;

        // Block with Fire 4 -> Effective 2 (Fail)
        let result = combat.blockEnemy(enemy, [{ value: 4, element: ATTACK_ELEMENTS.FIRE }]);
        expect(result.blocked).toBe(false);
        expect(result.totalBlock).toBe(2);

        // Block with Cold Fire 4 -> Effective 4 (Success)
        combat.blockedEnemies.clear();
        result = combat.blockEnemy(enemy, [{ value: 4, element: ATTACK_ELEMENTS.COLD_FIRE }]);
        expect(result.blocked).toBe(true);
        expect(result.totalBlock).toBe(4);
    });

    it('should combine multiple block sources', () => {
        const enemy = createEnemy('orc');
        enemy.attack = 3; // Fire Attack
        enemy.attackType = ATTACK_ELEMENTS.FIRE;

        const combat = new Combat(game.hero, [enemy]);
        combat.phase = COMBAT_PHASES.BLOCK;

        // Ice 2 (Eff 2) + Physical 2 (Eff 1) = Total 3. Success.
        const blocks = [
            { value: 2, element: ATTACK_ELEMENTS.ICE },
            { value: 2, element: ATTACK_ELEMENTS.PHYSICAL }
        ];

        const result = combat.blockEnemy(enemy, blocks);
        expect(result.blocked).toBe(true);
        expect(result.totalBlock).toBe(3);
    });
});
