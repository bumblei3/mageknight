import { describe, it, expect, vi } from 'vitest';
import { Hero } from '../../js/hero';
import { HeroController } from '../../js/game/HeroController';
import { HERO_SKILLS } from '../../js/skills/skillDefinitions';

function makeGame(hero) {
    const game = {
        hero,
        combat: null,
        combatOrchestrator: null,
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

describe('flight skill behavior', () => {
    it('grants +2 movement points and marks the hero as flying', () => {
        const hero = heroWith('flight', 'GOLDYX');
        const before = hero.movementPoints;

        const game = makeGame(hero);
        const controller = new HeroController(game);
        game.heroController = controller;

        const result = controller.useActiveSkill('flight');

        expect(result.success).toBe(true);
        expect(hero.movementPoints).toBe(before + 2);
        expect(hero.hasStatus('flight')).toBe(true);
        expect(hero.usedSkills.has('flight')).toBe(true);
    });
});

describe('dark_pact skill behavior', () => {
    it('draws 2 cards and inflicts 1 wound', () => {
        const hero = heroWith('dark_pact');
        if (hero.deck.length === 0) {
            hero.deck.push({ id: 'c1', name: 'Card1', isWound: () => false });
            hero.deck.push({ id: 'c2', name: 'Card2', isWound: () => false });
            hero.deck.push({ id: 'c3', name: 'Card3', isWound: () => false });
        }
        const handBefore = hero.hand.length;
        const woundsBefore = hero.wounds.length;

        const game = makeGame(hero);
        const controller = new HeroController(game);
        game.heroController = controller;

        const result = controller.useActiveSkill('dark_pact');

        expect(result.success).toBe(true);
        expect(hero.hand.length).toBeGreaterThanOrEqual(handBefore + 1);
        expect(hero.wounds.length).toBe(woundsBefore + 1);
        expect(hero.usedSkills.has('dark_pact')).toBe(true);
    });
});

describe('glittering_fortune skill behavior', () => {
    it('grants a random crystal each round', () => {
        const hero = heroWith('glittering_fortune', 'NOROWAS');
        const before = Object.values(hero.crystals).reduce((a, b) => a + (b || 0), 0);

        hero.prepareNewRound();

        const after = Object.values(hero.crystals).reduce((a, b) => a + (b || 0), 0);
        expect(after).toBeGreaterThanOrEqual(before + 1);
    });
});
