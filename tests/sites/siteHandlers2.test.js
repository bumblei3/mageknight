import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MineHandler } from '../../js/sites/MineHandler.js';
import { CityHandler } from '../../js/sites/CityHandler.js';
import { SpawningGroundsHandler } from '../../js/sites/SpawningGroundsHandler.js';

/**
 * Supplement to the site handler tests: covers RNG branches in MineHandler
 * (attackMine deep/shallow, collectMineCrystal color selection) plus the
 * previously untested CityHandler and SpawningGroundsHandler getOptions/actions.
 *
 * Uses plain-object mock games (same approach as siteHandlers.test.js) so the
 * coverage is reliable in the full suite run.
 */

function makeGame() {
    const hero = {
        movementPoints: 5,
        influencePoints: 20,
        crystals: { RED: 0, BLUE: 0, GREEN: 0, WHITE: 0 },
        gainCrystal: vi.fn(),
        gainFame: vi.fn(),
        units: [],
        wounds: [],
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

describe('MineHandler - RNG branches', () => {
    let game;
    let handler;
    let spyRandom;

    beforeEach(() => {
        game = makeGame();
        handler = new MineHandler(game);
        spyRandom = vi.spyOn(Math, 'random');
    });

    afterEach(() => {
        spyRandom.mockRestore();
    });

    it('attackMine spawns deep overseer when random > 0.6', () => {
        spyRandom.mockReturnValue(0.9);
        handler.attackMine();
        const enemy = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemy.name).toBe('Minen-Aufseher');
        expect(enemy.armor).toBe(5);
        expect(enemy.attack).toBe(5);
    });

    it('attackMine spawns shallow guardian when random <= 0.6', () => {
        spyRandom.mockReturnValue(0.1);
        handler.attackMine();
        const enemy = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemy.name).toBe('Kristall-Wächter');
        expect(enemy.armor).toBe(4);
        expect(enemy.physicalResist).toBe(true);
    });

    it('collectMineCrystal selects a deterministic color and deducts movement', () => {
        spyRandom.mockReturnValue(0); // index 0 -> red
        const result = handler.collectMineCrystal({ q: 1, r: 0 });
        expect(result.success).toBe(true);
        expect(game.hero.gainCrystal).toHaveBeenCalledWith('red');
        expect(game.hero.movementPoints).toBe(4);
        expect(game.particleSystem.buffEffect).toHaveBeenCalled();
    });

    it('collectMineCrystal picks a different color for high random', () => {
        spyRandom.mockReturnValue(0.99); // last color -> white
        handler.collectMineCrystal({ q: 1, r: 0 });
        expect(game.hero.gainCrystal).toHaveBeenCalledWith('white');
    });
});

describe('CityHandler', () => {
    let game;
    let handler;

    beforeEach(() => {
        game = makeGame();
        handler = new CityHandler(game);
    });

    it('offers heal, elite recruit and spell-shop options', () => {
        game.hero.wounds = [{ id: 'w1' }];
        const options = handler.getOptions({});
        expect(options.find((o) => o.id === 'heal')).toBeDefined();
        const recruit = options.find((o) => o.id === 'recruit_elite');
        expect(recruit).toBeDefined();
        expect(recruit.subItems.length).toBeGreaterThan(0);
        const spells = options.find((o) => o.id === 'city_spells');
        expect(spells).toBeDefined();
        expect(spells.subItems.length).toBeGreaterThan(0);
        // city spells cost 8
        expect(spells.subItems[0].cost).toBe(8);
    });

    it('disables heal option when no wounds', () => {
        game.hero.wounds = [];
        const options = handler.getOptions({});
        expect(options.find((o) => o.id === 'heal').enabled).toBe(false);
    });

    it('recruit_elite sub-item delegates to recruitUnit', () => {
        const options = handler.getOptions({});
        const sub = options.find((o) => o.id === 'recruit_elite').subItems[0];
        const result = sub.action();
        expect(result.success).toBe(true);
        expect(game.hero.addUnit).toHaveBeenCalled();
    });

    it('city spell sub-item buys a card (mana present)', () => {
        const options = handler.getOptions({});
        const sub = options.find((o) => o.id === 'city_spells').subItems[0];
        const result = sub.action();
        expect(result.success).toBe(true);
        expect(game.hero.discard.length).toBe(1);
        expect(game.hero.influencePoints).toBeLessThan(20);
    });

    it('heal action uses healWounds with cost 4', () => {
        game.hero.wounds = [{ id: 'w1' }];
        game.hero.influencePoints = 10;
        const options = handler.getOptions({});
        const result = options.find((o) => o.id === 'heal').action();
        expect(result.success).toBe(true);
        expect(game.hero.healWound).toHaveBeenCalledWith(false);
        expect(game.hero.influencePoints).toBe(6); // 10 - 4 per wound
    });

    it('heal action fails without wounds', () => {
        game.hero.wounds = [];
        const options = handler.getOptions({});
        const result = options.find((o) => o.id === 'heal').action();
        expect(result.success).toBe(false);
    });
});

describe('SpawningGroundsHandler', () => {
    let game;
    let handler;
    let spyRandom;

    beforeEach(() => {
        game = makeGame();
        handler = new SpawningGroundsHandler(game);
        spyRandom = vi.spyOn(Math, 'random');
    });

    afterEach(() => {
        spyRandom.mockRestore();
    });

    it('shows cleared option when conquered', () => {
        const options = handler.getOptions({ conquered: true });
        expect(options[0].id).toBe('cleared');
        expect(options[0].enabled).toBe(false);
    });

    it('offers attack option when not conquered', () => {
        const options = handler.getOptions({ conquered: false });
        expect(options[0].id).toBe('attack_spawning');
        expect(options[0].enabled).toBe(true);
    });

    it('attackSpawningGrounds spawns queen + minion when random > 0.5', () => {
        spyRandom.mockReturnValue(0.9);
        handler.attackSpawningGrounds();
        const enemies = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemies.length).toBe(2);
        expect(enemies[0].name).toBe('Spinnen-Königin');
        expect(enemies[1].name).toBe('Sumpf-Ratte');
    });

    it('attackSpawningGrounds spawns horde + minion when random <= 0.5', () => {
        spyRandom.mockReturnValue(0.1);
        handler.attackSpawningGrounds();
        const enemies = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemies[0].name).toBe('Ork-Horde');
        expect(enemies[1].name).toBe('Sumpf-Ratte');
    });

    it('onCombatEnd awards rewards via SiteRewardManager', () => {
        // The combat callback is passed to initiateCombat. Invoke it with a
        // fake defeated-enemy list and verify rewards are logged.
        handler.attackSpawningGrounds();
        const callback = game.combatOrchestrator.initiateCombat.mock.calls[0][1];
        expect(typeof callback).toBe('function');
        callback([{ name: 'Ork-Horde' }]);
        expect(game.addLog).toHaveBeenCalledWith(expect.stringContaining('Belohnung'), 'success');
    });

    it('attack action from options triggers combat', () => {
        const options = handler.getOptions({ conquered: false });
        const result = options[0].action();
        expect(result.success).toBe(true);
        expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalled();
    });
});
