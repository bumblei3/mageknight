import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeepHandler } from '../../js/sites/KeepHandler.js';
import { MonasteryHandler } from '../../js/sites/MonasteryHandler.js';
import { VillageHandler } from '../../js/sites/VillageHandler.js';
import { LabyrinthHandler } from '../../js/sites/LabyrinthHandler.js';
import { MageTowerHandler } from '../../js/sites/MageTowerHandler.js';

/**
 * Focused tests for the previously untested site handlers:
 *   - KeepHandler        (0% -> covered)
 *   - MonasteryHandler   (0% -> covered)
 *   - VillageHandler     (0% -> covered)
 *   - LabyrinthHandler   (0% -> covered)
 *   - MageTowerHandler   (0% -> covered)
 *
 * Handlers extend BaseSiteHandler and only touch `this.game` hooks, so a
 * plain-object mock game is sufficient. RNG branches (Math.random) are toggled
 * via a spy so both sides of each conditional are exercised deterministically.
 */

function makeMockGame() {
    const hero = {
        influencePoints: 20,
        wounds: [],
        crystals: { red: 0, blue: 0, green: 0, white: 0, gold: 0, black: 0 },
        discard: [],
        addUnit: vi.fn().mockReturnValue(true),
        healWound: vi.fn().mockReturnValue(true),
        getManaInventory: vi.fn().mockReturnValue(['red', 'blue', 'green', 'white']),
        removeMana: vi.fn(),
    };
    return {
        hero,
        addLog: vi.fn(),
        updateStats: vi.fn(),
        showNotification: vi.fn(),
        combatOrchestrator: {
            initiateCombat: vi.fn(),
        },
        hexGrid: {
            axialToPixel: vi.fn().mockReturnValue({ x: 10, y: 20 }),
        },
        particleSystem: {
            buffEffect: vi.fn(),
        },
    };
}

describe('KeepHandler', () => {
    let game;
    let handler;

    beforeEach(() => {
        game = makeMockGame();
        handler = new KeepHandler(game);
    });

    it('offers attack option when not conquered', () => {
        const options = handler.getOptions({ conquered: false, getName: () => 'Burg' });
        const attack = options.find((o) => o.id === 'attack');
        expect(attack).toBeDefined();
        expect(attack.enabled).toBe(true);
    });

    it('offers recruit + artifact options when conquered', () => {
        const options = handler.getOptions({ conquered: true, artifactClaimed: false });
        const recruit = options.find((o) => o.id === 'recruit');
        const artifact = options.find((o) => o.id === 'artifact');
        expect(recruit).toBeDefined();
        expect(recruit.subItems.length).toBeGreaterThan(0);
        expect(artifact).toBeDefined();
    });

    it('hides artifact option once claimed', () => {
        const options = handler.getOptions({ conquered: true, artifactClaimed: true });
        expect(options.find((o) => o.id === 'artifact')).toBeUndefined();
    });

    it('attackSite initiates combat with a fortified guard', () => {
        const result = handler.attackSite({ getName: () => 'Burg' });
        expect(result.success).toBe(true);
        expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalled();
        const enemy = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemy.fortified).toBe(true);
        expect(enemy.armor).toBeGreaterThan(0);
        expect(enemy.attack).toBeGreaterThan(0);
    });

    it('claimArtifact adds a card to discard and marks site claimed', () => {
        const site = { conquered: true, artifactClaimed: false };
        const result = handler.claimArtifact(site);
        expect(result.success).toBe(true);
        expect(game.hero.discard.length).toBe(1);
        expect(site.artifactClaimed).toBe(true);
        expect(game.showNotification).toHaveBeenCalled();
    });

    it('claimArtifact fails gracefully without a hero', () => {
        handler.game = {};
        const result = handler.claimArtifact({});
        expect(result.success).toBe(false);
    });
});

describe('MonasteryHandler', () => {
    let game;
    let handler;

    beforeEach(() => {
        game = makeMockGame();
        handler = new MonasteryHandler(game);
    });

    it('offers heal, train and artifact options', () => {
        game.hero.wounds = [{ id: 'w1' }];
        game.hero._inventory = {};
        const options = handler.getOptions({});
        expect(options.find((o) => o.id === 'heal')).toBeDefined();
        expect(options.find((o) => o.id === 'train').subItems.length).toBeGreaterThan(0);
        expect(options.find((o) => o.id === 'artifact')).toBeDefined();
    });

    it('disables heal option when hero has no wounds', () => {
        game.hero.wounds = [];
        const options = handler.getOptions({});
        expect(options.find((o) => o.id === 'heal').enabled).toBe(false);
    });

    it('hides artifact option once monastery artifact claimed', () => {
        game.hero._inventory = { artifactsClaimed: { monastery: true } };
        const options = handler.getOptions({});
        expect(options.find((o) => o.id === 'artifact')).toBeUndefined();
    });

    it('claimArtifact adds card and tracks claimed state', () => {
        game.hero._inventory = {};
        const result = handler.claimArtifact();
        expect(result.success).toBe(true);
        expect(game.hero.discard.length).toBe(1);
        expect(game.hero._inventory.artifactsClaimed.monastery).toBe(true);
    });

    it('claimArtifact fails gracefully without a hero', () => {
        handler.game = {};
        const result = handler.claimArtifact();
        expect(result.success).toBe(false);
    });
});

describe('VillageHandler', () => {
    let game;
    let handler;

    beforeEach(() => {
        game = makeMockGame();
        handler = new VillageHandler(game);
    });

    it('offers heal and recruit options', () => {
        game.hero.wounds = [{ id: 'w1' }];
        const options = handler.getOptions({});
        const heal = options.find((o) => o.id === 'heal');
        const recruit = options.find((o) => o.id === 'recruit');
        expect(heal).toBeDefined();
        expect(recruit).toBeDefined();
        expect(recruit.subItems.length).toBeGreaterThan(0);
    });

    it('disables heal when no wounds present', () => {
        game.hero.wounds = [];
        const options = handler.getOptions({});
        expect(options.find((o) => o.id === 'heal').enabled).toBe(false);
    });

    it('recruit sub-item action delegates to recruitUnit', () => {
        game.hero.wounds = [{ id: 'w1' }];
        const options = handler.getOptions({});
        const recruit = options.find((o) => o.id === 'recruit');
        const sub = recruit.subItems[0];
        const result = sub.action();
        expect(game.hero.addUnit).toHaveBeenCalled();
        expect(game.hero.influencePoints).toBeLessThan(20);
        expect(result.success).toBe(true);
    });
});

describe('Site handler sub-item actions', () => {
    let game;
    let handler;

    beforeEach(() => {
        game = makeMockGame();
    });

    it('Keep recruit sub-item recruits a unit', () => {
        handler = new KeepHandler(game);
        const options = handler.getOptions({ conquered: true, artifactClaimed: false });
        const sub = options.find((o) => o.id === 'recruit').subItems[0];
        const result = sub.action();
        expect(result.success).toBe(true);
        expect(game.hero.addUnit).toHaveBeenCalled();
    });

    it('Keep artifact action claims an artifact', () => {
        handler = new KeepHandler(game);
        const options = handler.getOptions({ conquered: true, artifactClaimed: false });
        const result = options.find((o) => o.id === 'artifact').action();
        expect(result.success).toBe(true);
        expect(game.hero.discard.length).toBe(1);
    });

    it('MageTower spell sub-item buys a card (mana present)', () => {
        handler = new MageTowerHandler(game);
        const options = handler.getOptions({ conquered: true, artifactClaimed: false });
        const sub = options.find((o) => o.id === 'spells').subItems[0];
        const result = sub.action();
        expect(result.success).toBe(true);
        expect(game.hero.discard.length).toBe(1);
        expect(game.hero.influencePoints).toBeLessThan(20);
    });

    it('MageTower artifact action claims an artifact', () => {
        handler = new MageTowerHandler(game);
        const options = handler.getOptions({ conquered: true, artifactClaimed: false });
        const result = options.find((o) => o.id === 'artifact').action();
        expect(result.success).toBe(true);
        expect(game.hero.discard.length).toBe(1);
    });

    it('Monastery train sub-item buys an advanced action card', () => {
        handler = new MonasteryHandler(game);
        game.hero.wounds = [{ id: 'w1' }];
        game.hero._inventory = {};
        const options = handler.getOptions({});
        const sub = options.find((o) => o.id === 'train').subItems[0];
        const result = sub.action();
        expect(result.success).toBe(true);
        expect(game.hero.discard.length).toBe(1);
    });

    it('Monastery heal action uses healWounds', () => {
        handler = new MonasteryHandler(game);
        game.hero.wounds = [{ id: 'w1' }];
        game.hero._inventory = {};
        game.hero.influencePoints = 10;
        const options = handler.getOptions({});
        const result = options.find((o) => o.id === 'heal').action();
        expect(result.success).toBe(true);
        expect(game.hero.healWound).toHaveBeenCalledWith(false);
        expect(game.hero.influencePoints).toBe(8); // 10 - 2 per wound
    });

    it('Monastery heal action fails without wounds', () => {
        handler = new MonasteryHandler(game);
        game.hero.wounds = [];
        game.hero._inventory = {};
        const options = handler.getOptions({});
        const result = options.find((o) => o.id === 'heal').action();
        expect(result.success).toBe(false);
    });

    it('Monastery artifact action claims an artifact', () => {
        handler = new MonasteryHandler(game);
        game.hero._inventory = {};
        const options = handler.getOptions({});
        const result = options.find((o) => o.id === 'artifact').action();
        expect(result.success).toBe(true);
        expect(game.hero.discard.length).toBe(1);
    });
});

describe('LabyrinthHandler', () => {
    let game;
    let handler;
    let spyRandom;

    beforeEach(() => {
        game = makeMockGame();
        handler = new LabyrinthHandler(game);
        spyRandom = vi.spyOn(Math, 'random');
    });

    afterEach(() => {
        spyRandom.mockRestore();
    });

    it('offers explore option when not conquered', () => {
        const options = handler.getOptions({ conquered: false });
        expect(options.find((o) => o.id === 'explore_labyrinth')).toBeDefined();
    });

    it('shows cleared message when conquered', () => {
        const options = handler.getOptions({ conquered: true });
        expect(options[0].id).toBe('cleared');
        expect(options[0].enabled).toBe(false);
    });

    it('exploreLabyrinth spawns two enemies (mage + dragon branches)', () => {
        // >0.5 -> mage ; >0.6 -> dragon
        spyRandom.mockReturnValue(0.9);
        handler.exploreLabyrinth();
        expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalled();
        const enemies = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(Array.isArray(enemies)).toBe(true);
        expect(enemies.length).toBe(2);
        expect(enemies[0].type).toBe('mage');
        expect(enemies[1].type).toBe('draconum');
    });

    it('exploreLabyrinth spawns golem + orc branches', () => {
        // <0.5 -> golem ; <0.6 -> orc
        spyRandom.mockReturnValue(0.1);
        handler.exploreLabyrinth();
        const enemies = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemies[0].type).toBe('golem');
        expect(enemies[1].type).toBe('orc_khan');
    });
});

describe('MageTowerHandler', () => {
    let game;
    let handler;

    beforeEach(() => {
        game = makeMockGame();
        handler = new MageTowerHandler(game);
    });

    it('offers attack option when not conquered', () => {
        const options = handler.getOptions({ conquered: false, getName: () => 'Turm' });
        expect(options.find((o) => o.id === 'attack')).toBeDefined();
    });

    it('offers spells + artifact options when conquered', () => {
        const options = handler.getOptions({ conquered: true, artifactClaimed: false });
        const spells = options.find((o) => o.id === 'spells');
        const artifact = options.find((o) => o.id === 'artifact');
        expect(spells).toBeDefined();
        expect(spells.subItems.length).toBeGreaterThan(0);
        expect(artifact).toBeDefined();
        // spell cost is 7 per the handler
        expect(spells.subItems[0].cost).toBe(7);
    });

    it('hides artifact option once claimed', () => {
        const options = handler.getOptions({ conquered: true, artifactClaimed: true });
        expect(options.find((o) => o.id === 'artifact')).toBeUndefined();
    });

    it('attackSite initiates combat with a fortified fire tower guard', () => {
        const result = handler.attackSite({ getName: () => 'Turm' });
        expect(result.success).toBe(true);
        const enemy = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemy.fortified).toBe(true);
        expect(enemy.attackType).toBe('fire');
    });

    it('claimArtifact adds card to discard and marks site claimed', () => {
        const site = { conquered: true, artifactClaimed: false };
        const result = handler.claimArtifact(site);
        expect(result.success).toBe(true);
        expect(game.hero.discard.length).toBe(1);
        expect(site.artifactClaimed).toBe(true);
        expect(game.showNotification).toHaveBeenCalled();
    });

    it('claimArtifact fails gracefully without a hero', () => {
        handler.game = {};
        const result = handler.claimArtifact({});
        expect(result.success).toBe(false);
    });
});
