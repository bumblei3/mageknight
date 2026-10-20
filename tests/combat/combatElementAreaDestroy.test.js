/**
 * Combat rules that the card data declared but the engine ignored:
 *  - `element` (fire / ice / cold_fire) — attacks counted as physical, so enemy
 *    resistances and elemental efficiency never applied.
 *  - `area` / `target: 'all'` — the card value was pooled into the single
 *    strike instead of hitting every enemy on its own.
 *  - `destroy_enemy` (Disintegrate) — the card did nothing at all.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Combat } from '../../js/combat.js';
import { CombatOrchestrator } from '../../js/game/CombatOrchestrator.js';
import { Card } from '../../js/card/CardFactory.js';
import { COMBAT_PHASES } from '../../js/constants.js';
import { HeroBuilder, createMockEnemy } from '../test-helpers.js';
import { setLanguage } from '../../js/i18n/index.js';

const attackCard = (effect, overrides = {}) =>
    new Card({
        id: overrides.id || 'test_attack',
        name: overrides.name || 'Test Attack',
        type: 'action',
        color: 'red',
        basicEffect: effect,
        ...overrides
    });

function makeFight({ enemies, hand }) {
    const hero = new HeroBuilder().withHand(hand).withDeck([]).build();
    hero.discard = [];

    const combat = new Combat(hero, enemies);
    combat.phase = COMBAT_PHASES.ATTACK;

    const logs = [];
    const game = {
        combat,
        hero,
        enemies,
        timeManager: { isNight: () => false },
        actionManager: { saveCheckpoint: vi.fn(), clearHistory: vi.fn() },
        ui: {
            elements: { playedCards: null },
            addPlayedCard: vi.fn(),
            showPlayArea: vi.fn(),
            updateCombatTotals: vi.fn()
        },
        addLog: (message, type) => logs.push({ message, type }),
        renderHand: vi.fn(),
        updateStats: vi.fn()
    };

    const orchestrator = new CombatOrchestrator(game);
    orchestrator.onCombatEnd = vi.fn();

    return { game, combat, hero, orchestrator, logs };
}

describe('combat — attack element comes from the played cards', () => {
    beforeEach(() => setLanguage('de'));

    it('counts physical as the element when a card declares none', () => {
        const { hero, orchestrator } = makeFight({
            enemies: [createMockEnemy({ armor: 3 })],
            hand: [attackCard({ type: 'attack', value: 2 })]
        });

        orchestrator.playCardInCombat(0, hero.hand[0]);

        expect(orchestrator.getDominantAttackElement()).toBe('physical');
    });

    it('remembers the element of an attack card (Fire Blast)', () => {
        const { hero, orchestrator } = makeFight({
            enemies: [createMockEnemy({ armor: 3 })],
            hand: [attackCard({ type: 'attack', value: 4, element: 'fire' })]
        });

        orchestrator.playCardInCombat(0, hero.hand[0]);

        expect(orchestrator.combatAttackElements).toEqual({ fire: 4 });
        expect(orchestrator.getDominantAttackElement()).toBe('fire');
    });

    it('picks the element with the largest contribution', () => {
        const { hero, orchestrator } = makeFight({
            enemies: [createMockEnemy({ armor: 3 })],
            hand: [
                attackCard({ type: 'attack', value: 2, element: 'ice' }),
                attackCard({ type: 'attack', value: 5, element: 'fire' }, { id: 'big_fire' })
            ]
        });

        orchestrator.playCardInCombat(0, hero.hand[0]);
        orchestrator.playCardInCombat(0, hero.hand[0]);

        expect(orchestrator.getDominantAttackElement()).toBe('fire');
    });

    it('hands the dominant element to the attack phase', () => {
        const { combat, hero, orchestrator } = makeFight({
            enemies: [createMockEnemy({ armor: 3, fame: 2 })],
            hand: [attackCard({ type: 'attack', value: 4, element: 'fire' })]
        });
        const spy = vi.spyOn(combat, 'attackEnemies');

        orchestrator.playCardInCombat(0, hero.hand[0]);
        orchestrator.executeAttackAction();

        expect(spy).toHaveBeenCalledWith(4, 'fire');
    });
});

describe('combat — ranged attacks use their element too', () => {
    beforeEach(() => setLanguage('de'));

    it('remembers the element of a ranged card', () => {
        const { combat, hero, orchestrator } = makeFight({
            enemies: [createMockEnemy({ armor: 3 })],
            hand: [attackCard({ type: 'attack', value: 4, element: 'ice', ranged: true })]
        });
        combat.phase = COMBAT_PHASES.RANGED;

        orchestrator.playCardInCombat(0, hero.hand[0]);

        expect(orchestrator.combatRangedTotal).toBe(4);
        expect(orchestrator.getDominantRangedElement()).toBe('ice');
    });

    it('hands the ranged element to the ranged attack', () => {
        const enemy = createMockEnemy({ armor: 3, fame: 2 });
        const { combat, hero, orchestrator } = makeFight({
            enemies: [enemy],
            hand: [attackCard({ type: 'attack', value: 4, element: 'ice', ranged: true })]
        });
        combat.phase = COMBAT_PHASES.RANGED;
        const spy = vi.spyOn(combat, 'rangedAttackEnemy');

        orchestrator.playCardInCombat(0, hero.hand[0]);
        orchestrator.executeRangedAttack(enemy);

        expect(spy.mock.calls[0][3]).toBe('ice');
    });
});

describe('combat — area attacks hit every enemy separately', () => {
    beforeEach(() => setLanguage('de'));

    it('keeps area values out of the pooled strike', () => {
        const { hero, orchestrator } = makeFight({
            enemies: [createMockEnemy({ armor: 3 }), createMockEnemy({ armor: 3 })],
            hand: [attackCard({ type: 'attack', value: 4, element: 'fire', area: true })]
        });

        orchestrator.playCardInCombat(0, hero.hand[0]);

        expect(orchestrator.combatAreaStrikes).toEqual([{ value: 4, element: 'fire' }]);
        expect(orchestrator.combatAttackTotal).toBe(0);
    });

    it('treats target: "all" like an area attack', () => {
        const { hero, orchestrator } = makeFight({
            enemies: [createMockEnemy({ armor: 3 }), createMockEnemy({ armor: 3 })],
            hand: [attackCard({ type: 'attack', value: 5, element: 'fire', area: true, target: 'all' })]
        });

        orchestrator.playCardInCombat(0, hero.hand[0]);

        expect(orchestrator.combatAreaStrikes).toHaveLength(1);
        expect(orchestrator.combatAttackTotal).toBe(0);
    });

    it('defeats several enemies with one area attack', () => {
        const enemies = [createMockEnemy({ armor: 3, fame: 2 }), createMockEnemy({ armor: 3, fame: 2 })];
        const { combat, hero, orchestrator } = makeFight({
            enemies,
            hand: [attackCard({ type: 'attack', value: 4, element: 'fire', area: true })]
        });

        orchestrator.playCardInCombat(0, hero.hand[0]);
        orchestrator.executeAttackAction();

        // 4 fire damage against armor 3 kills both enemies on their own strikes
        expect(combat.defeatedEnemies).toHaveLength(2);
        expect(combat.enemies).toHaveLength(0);
    });
});

describe('combat — Disintegrate destroys enemies outright', () => {
    beforeEach(() => setLanguage('de'));

    it('collects the destroy count while cards are played', () => {
        const { hero, orchestrator } = makeFight({
            enemies: [createMockEnemy({ armor: 9 })],
            hand: [attackCard({ type: 'destroy_enemy', value: 1 })]
        });

        orchestrator.playCardInCombat(0, hero.hand[0]);

        expect(orchestrator.pendingDestroyEnemies).toBe(1);
    });

    it('destroys a heavily armored enemy without attacking it', () => {
        const enemy = createMockEnemy({ armor: 99, fame: 3 });
        const { combat, hero, orchestrator } = makeFight({
            enemies: [enemy],
            hand: [attackCard({ type: 'destroy_enemy', value: 1 })]
        });

        orchestrator.playCardInCombat(0, hero.hand[0]);
        orchestrator.executeAttackAction();

        expect(combat.defeatedEnemies).toContain(enemy);
        expect(combat.enemies).toHaveLength(0);
        expect(orchestrator.pendingDestroyEnemies).toBe(0);
    });

    it('cannot destroy a boss and says so', () => {
        const boss = createMockEnemy({
            armor: 3,
            isBoss: true,
            name: 'Drachenlord',
            takeDamage: vi.fn(() => ({ defeated: false, healthPercent: 50 }))
        });
        const { combat, hero, orchestrator, logs } = makeFight({
            enemies: [boss],
            hand: [attackCard({ type: 'destroy_enemy', value: 1 })]
        });

        orchestrator.playCardInCombat(0, hero.hand[0]);
        orchestrator.executeAttackAction();

        expect(boss.isBoss).toBe(true);
        expect(logs.some((entry) => entry.message.includes('Boss'))).toBe(true);
        expect(combat.defeatedEnemies).toHaveLength(0);
    });

    it('destroys a boss-free group up to the card value', () => {
        const enemies = [
            createMockEnemy({ armor: 9, fame: 2 }),
            createMockEnemy({ armor: 9, fame: 2 }),
            createMockEnemy({ armor: 9, fame: 2 })
        ];
        const { combat, hero, orchestrator } = makeFight({
            enemies,
            hand: [attackCard({ type: 'destroy_enemy', value: 2 })]
        });

        orchestrator.playCardInCombat(0, hero.hand[0]);
        orchestrator.executeAttackAction();

        expect(combat.defeatedEnemies).toHaveLength(2);
        expect(combat.enemies).toHaveLength(1);
    });
});

describe('AttackPhase.destroyEnemies guards', () => {
    beforeEach(() => setLanguage('de'));

    it('refuses to destroy outside the attack phase', () => {
        const { combat } = makeFight({
            enemies: [createMockEnemy({ armor: 3 })],
            hand: []
        });
        combat.phase = COMBAT_PHASES.BLOCK;

        const result = combat.destroyEnemies(1);

        expect(result.error).toBeDefined();
        expect(result.destroyed).toBeUndefined();
    });
});
