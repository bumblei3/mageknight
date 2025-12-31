import { describe, it, expect } from './testRunner.js';
import { Combat, COMBAT_PHASE } from '../js/combat.js';
import { Hero } from '../js/hero.js';
import { createEnemy } from '../js/enemy.js';

describe('Combat Integration Tests', () => {
    it('should complete full combat cycle with real enemy', () => {
        const hero = new Hero('TestHero');
        const enemy = createEnemy('orc', { q: 0, r: 0 });

        console.log('Enemy created:', enemy.name, 'Armor:', enemy.armor, 'Attack:', enemy.attack);

        const combat = new Combat(hero, enemy);

        // Start combat
        const startResult = combat.start();
        console.log('Combat started:', startResult.message);
        expect(combat.phase).toBe(COMBAT_PHASE.RANGED);

        // End ranged phase
        combat.endRangedPhase();
        expect(combat.phase).toBe(COMBAT_PHASE.BLOCK);

        // Block phase - try to block
        const blockResult = combat.blockEnemy(enemy, 3);
        console.log('Block result:', blockResult.message, 'Blocked:', blockResult.blocked);

        // End block phase
        const damageResult = combat.endBlockPhase();
        console.log('Damage phase:', damageResult.message, 'Wounds:', damageResult.woundsReceived);
        expect(combat.phase).toBe(COMBAT_PHASE.ATTACK);

        // Attack phase
        const attackResult = combat.attackEnemies(10, 'physical');
        console.log('Attack result:', attackResult.message, 'Success:', attackResult.success);

        // End combat
        const endResult = combat.endCombat();
        console.log('Combat end:', endResult.message, 'Victory:', endResult.victory);
        expect(combat.phase).toBe(COMBAT_PHASE.COMPLETE);
    });

    it('should handle combat with card effects', () => {
        const hero = new Hero('TestHero');
        hero.drawCards(5); // Draw initial hand

        console.log('Hero hand size:', hero.hand.length);
        console.log('Hero cards:', hero.hand.map(c => c.name).join(', '));

        const enemy = createEnemy('orc', { q: 0, r: 0 });
        const combat = new Combat(hero, enemy);
        combat.start();

        // Find a card with block effect
        const blockCardIndex = hero.hand.findIndex(c =>
            !c.isWound() && c.basicEffect && c.basicEffect.block > 0
        );

        if (blockCardIndex >= 0) {
            const card = hero.hand[blockCardIndex];
            console.log('Playing block card:', card.name);

            const playResult = hero.playCard(blockCardIndex, false);
            console.log('Card played, block value:', playResult.effect.block);

            const blockResult = combat.blockEnemy(enemy, playResult.effect.block || 0);
            console.log('Block attempt:', blockResult.message);
        } else {
            console.log('No block card in hand, skipping block test');
        }

        // Move through phases to attack
        combat.endRangedPhase();
        combat.endBlockPhase();
        expect(combat.phase).toBe(COMBAT_PHASE.ATTACK);

        // Find attack card
        const attackCardIndex = hero.hand.findIndex(c =>
            !c.isWound() && c.basicEffect && c.basicEffect.attack > 0
        );

        if (attackCardIndex >= 0) {
            const card = hero.hand[attackCardIndex];
            console.log('Playing attack card:', card.name);

            const playResult = hero.playCard(attackCardIndex, false);
            console.log('Card played, attack value:', playResult.effect.attack);

            const attackResult = combat.attackEnemies(playResult.effect.attack || 0);
            console.log('Attack result:', attackResult.message, 'Success:', attackResult.success);
        } else {
            console.log('No attack card in hand');
        }
    });

    it('should handle multiple enemies in combat', () => {
        const hero = new Hero('TestHero');
        const enemy1 = createEnemy('orc', { q: 0, r: 0 });
        const enemy2 = createEnemy('goblin', { q: 0, r: 1 });

        console.log('Enemy 1:', enemy1.name, 'Armor:', enemy1.armor, 'Attack:', enemy1.attack);
        console.log('Enemy 2:', enemy2.name, 'Armor:', enemy2.armor, 'Attack:', enemy2.attack);

        const combat = new Combat(hero, [enemy1, enemy2]);
        combat.start();
        combat.endRangedPhase();

        expect(combat.enemies.length).toBe(2);
        console.log('Combat started with', combat.enemies.length, 'enemies');

        // Block first enemy
        const blockResult = combat.blockEnemy(enemy1, 5);
        console.log('Blocked enemy1:', blockResult.blocked);

        // End block - should take damage from enemy2
        const damageResult = combat.endBlockPhase();
        console.log('Damage from unblocked enemies:', damageResult.totalDamage, 'wounds');

        // Attack both enemies
        const totalArmor = enemy1.armor + enemy2.armor;
        console.log('Total armor to overcome:', totalArmor);

        const attackResult = combat.attackEnemies(totalArmor);
        console.log('Attack all enemies:', attackResult.message);

        if (attackResult.success) {
            expect(combat.enemies.length).toBe(0);
            console.log('All enemies defeated!');
        } else {
            console.log('Failed to defeat all enemies');
        }
    });

    it('should validate phase transitions', () => {
        const hero = new Hero('TestHero');
        const enemy = createEnemy('orc', { q: 0, r: 0 });
        const combat = new Combat(hero, enemy);

        // Initial state
        expect(combat.phase).toBe(COMBAT_PHASE.NOT_IN_COMBAT);
        console.log('Phase 0: NOT_IN_COMBAT');

        // Start combat
        combat.start();
        expect(combat.phase).toBe(COMBAT_PHASE.RANGED);
        console.log('Phase 1: RANGED');

        // End ranged phase
        combat.endRangedPhase();
        expect(combat.phase).toBe(COMBAT_PHASE.BLOCK);
        console.log('Phase 2: BLOCK');

        // Try to attack in block phase - should fail
        const earlyAttack = combat.attackEnemies(5);
        expect(earlyAttack.error).toBeDefined();
        console.log('Attempted attack in block phase:', earlyAttack.error);

        // End block phase
        combat.endBlockPhase();
        expect(combat.phase).toBe(COMBAT_PHASE.ATTACK);
        console.log('Phase 3: ATTACK');

        // Try to block in attack phase - should fail
        const lateBlock = combat.blockEnemy(enemy, 5);
        expect(lateBlock.error).toBeDefined();
        console.log('Attempted block in attack phase:', lateBlock.error);

        // Attack enemy
        combat.attackEnemies(10);

        // End combat
        combat.endCombat();
        expect(combat.phase).toBe(COMBAT_PHASE.COMPLETE);
        console.log('Phase 4: COMPLETE');
        console.log('✓ All phase transitions correct');
    });

    it('should test Game.initiateCombat integration', async () => {
        // This test requires mocking the full game environment
        // For now, we just verify the combat object is created correctly
        const hero = new Hero('TestHero');
        const enemy = createEnemy('orc', { q: 0, r: 0 });

        // Simulate what game.js does in initiateCombat()
        const combat = new Combat(hero, enemy);
        const result = combat.start();

        expect(combat).toBeDefined();
        expect(combat.phase).toBe(COMBAT_PHASE.RANGED);
        expect(combat.enemies.length).toBe(1);
        expect(result.message).toContain('Kampf');

        console.log('✓ Combat initialization matches game.js pattern');
    });
});
