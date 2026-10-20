import { describe, it, expect, vi } from 'vitest';
import { Hero } from '../../js/hero';
import { HeroController } from '../../js/game/HeroController';
import { Combat } from '../../js/combat';
import { COMBAT_PHASES } from '../../js/constants';
import { HERO_SKILLS } from '../../js/skills/skillDefinitions';
import { CombatOrchestrator } from '../../js/game/CombatOrchestrator';
describe('tactical_read skill behavior', () => {
    it('logs enemy values at combat start', () => {
        const hero = heroWith('tactical_read', 'TOVAK');
        const enemy = {
            id: 'e1',
            name: 'Orc',
            armor: 3,
            attack: 2,
            fame: 5,
            isBoss: false,
            getCurrentArmor: () => 3,
            getEffectiveAttack: () => 2,
        };
        const game = {
            combat: null,
            gameState: 'playing',
            isTestEnvironment: true,
            hero,
            enemies: [enemy],
            hexGrid: null,
            timeManager: { isNight: () => false },
            ui: {
                showCombatPanel: vi.fn(),
                updateCombatTotals: vi.fn(),
                updateCombatInfo: vi.fn(),
                elements: { playedCards: null },
                addPlayedCard: vi.fn(),
                showPlayArea: vi.fn(),
            },
            actionManager: { saveCheckpoint: vi.fn(), clearHistory: vi.fn() },
            addLog: vi.fn(),
            showToast: vi.fn(),
            updatePhaseIndicator: vi.fn(),
            updateStats: vi.fn(),
            renderHand: vi.fn(),
        };
        const orch = new CombatOrchestrator(game);
        game.combatOrchestrator = orch;

        orch.initiateCombat(enemy);

        const logged = game.addLog.mock.calls.map((c) => String(c[0]));
        expect(logged.some((m) => m.includes('Tactical Read'))).toBe(true);
    });
});


function makeEnemy(overrides = {}) {
    return {
        id: 'e1',
        name: 'Orc',
        armor: 5,
        attack: 2,
        fame: 1,
        isBoss: false,
        ...overrides,
    };
}

function makeGame(hero, enemy = makeEnemy()) {
    const combat = new Combat(hero, [enemy]);
    combat.phase = COMBAT_PHASES.ATTACK;

    const orchestrator = {
        combat,
        hero,
        combatAttackTotal: 0,
        combatBlockTotal: 0,
        combatRangedTotal: 0,
        combatAttackElements: {},
        combatRangedElements: {},
        activeBlocks: [],
        updateCombatTotals: vi.fn(),
    };
    combat.combatOrchestrator = orchestrator;

    const game = {
        hero,
        combat,
        combatOrchestrator: orchestrator,
        timeManager: { isNight: () => false },
        ui: { elements: { playedCards: null }, addPlayedCard: vi.fn(), showPlayArea: vi.fn(), updateCombatTotals: vi.fn() },
        actionManager: { saveCheckpoint: vi.fn(), clearHistory: vi.fn() },
        addLog: vi.fn(),
        renderHand: vi.fn(),
        renderMana: vi.fn(),
        updateStats: vi.fn(),
        showToast: vi.fn(),
        sound: null,
        particleSystem: null,
    };
    return game;
}

function heroWith(skillId, heroName = 'ARYTHEA') {
    const hero = new Hero(heroName);
    const def = Object.values(HERO_SKILLS).flatMap((g) => g.common).find((s) => s.id === skillId);
    hero.addSkill({ ...def });
    return hero;
}

describe('blood_rage skill behavior', () => {
    it('adds +3 attack and inflicts 1 wound', () => {
        const hero = heroWith('blood_rage');
        const game = makeGame(hero);
        const controller = new HeroController(game);
        game.heroController = controller;

        const woundsBefore = hero.wounds.length;
        const result = controller.useActiveSkill('blood_rage');

        expect(result.success).toBe(true);
        expect(game.combatOrchestrator.combatAttackTotal).toBe(3);
        expect(hero.wounds.length).toBe(woundsBefore + 1);
        expect(hero.usedSkills.has('blood_rage')).toBe(true);
    });

    it('fails outside combat', () => {
        const hero = heroWith('blood_rage');
        const game = makeGame(hero);
        game.combat = null;
        const controller = new HeroController(game);
        game.heroController = controller;

        const result = controller.useActiveSkill('blood_rage');
        expect(result.success).toBe(false);
    });
});

describe('iron_wall skill behavior', () => {
    it('adds +4 block and pushes an active block', () => {
        const hero = heroWith('iron_wall', 'TOVAK');
        const game = makeGame(hero);
        const controller = new HeroController(game);
        game.heroController = controller;

        const result = controller.useActiveSkill('iron_wall');

        expect(result.success).toBe(true);
        expect(game.combatOrchestrator.combatBlockTotal).toBe(4);
        expect(game.combatOrchestrator.activeBlocks).toHaveLength(1);
        expect(game.combatOrchestrator.activeBlocks[0].value).toBe(4);
        expect(hero.usedSkills.has('iron_wall')).toBe(true);
    });

    it('fails outside combat', () => {
        const hero = heroWith('iron_wall', 'TOVAK');
        const game = makeGame(hero);
        game.combat = null;
        const controller = new HeroController(game);
        game.heroController = controller;

        const result = controller.useActiveSkill('iron_wall');
        expect(result.success).toBe(false);
    });
});

describe('freezing_breath skill behavior', () => {
    it('reduces enemy armor by 3 (min 1) and sets attack to 0', () => {
        const hero = heroWith('freezing_breath', 'GOLDYX');
        const enemy = makeEnemy({ armor: 5, attack: 4 });
        const game = makeGame(hero, enemy);
        const controller = new HeroController(game);
        game.heroController = controller;

        const result = controller.useActiveSkill('freezing_breath');

        expect(result.success).toBe(true);
        expect(enemy.armor).toBe(2);
        expect(enemy.attack).toBe(0);
        expect(hero.usedSkills.has('freezing_breath')).toBe(true);
    });

    it('clamps armor to at least 1', () => {
        const hero = heroWith('freezing_breath', 'GOLDYX');
        const enemy = makeEnemy({ armor: 2, attack: 4 });
        const game = makeGame(hero, enemy);
        const controller = new HeroController(game);
        game.heroController = controller;

        controller.useActiveSkill('freezing_breath');
        expect(enemy.armor).toBe(1);
    });

    it('fails outside combat', () => {
        const hero = heroWith('freezing_breath', 'GOLDYX');
        const game = makeGame(hero);
        game.combat = null;
        const controller = new HeroController(game);
        game.heroController = controller;

        const result = controller.useActiveSkill('freezing_breath');
        expect(result.success).toBe(false);
    });
});

describe('fire_breath skill behavior', () => {
    it('adds +3 ranged fire attack', () => {
        const hero = heroWith('fire_breath', 'GOLDYX');
        const game = makeGame(hero);
        const controller = new HeroController(game);
        game.heroController = controller;

        const result = controller.useActiveSkill('fire_breath');

        expect(result.success).toBe(true);
        expect(game.combatOrchestrator.combatRangedTotal).toBe(3);
        expect(game.combatOrchestrator.combatRangedElements.fire).toBe(3);
        expect(hero.usedSkills.has('fire_breath')).toBe(true);
    });

    it('fails outside combat', () => {
        const hero = heroWith('fire_breath', 'GOLDYX');
        const game = makeGame(hero);
        game.combat = null;
        const controller = new HeroController(game);
        game.heroController = controller;

        const result = controller.useActiveSkill('fire_breath');
        expect(result.success).toBe(false);
    });
});
