import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MageKnightGame } from '../../js/game.js';
import { KeepHandler } from '../../js/sites/KeepHandler.js';
import { MageTowerHandler } from '../../js/sites/MageTowerHandler.js';
import { MineHandler } from '../../js/sites/MineHandler.js';
import { SpawningGroundsHandler } from '../../js/sites/SpawningGroundsHandler.js';
import { ExplorationHandler } from '../../js/sites/ExplorationHandler.js';
import { LabyrinthHandler } from '../../js/sites/LabyrinthHandler.js';
import { CityHandler } from '../../js/sites/CityHandler.js';
import { VillageHandler } from '../../js/sites/VillageHandler.js';
import { MonasteryHandler } from '../../js/sites/MonasteryHandler.js';

// Mock dependencies
vi.mock('../../js/particles.js');
vi.mock('../../js/particles/WeatherSystem.js');

describe('Site Handlers - Coverage Boost', () => {
    let game;

    beforeEach(() => {
        game = new MageKnightGame();
        game.particleSystem = {
            dustCloudEffect: vi.fn(),
            trailEffect: vi.fn(),
            shieldBlockEffect: vi.fn(),
            createFloatingText: vi.fn(),
            damageSplatter: vi.fn(),
            createDamageNumber: vi.fn(),
            triggerShake: vi.fn(),
            registerSystem: vi.fn()
        };
    });

    describe('KeepHandler', () => {
        let handler;

        beforeEach(() => {
            handler = new KeepHandler(game);
        });

        it('should return attack option for unconquered keep', () => {
            const site = { conquered: false, getName: () => 'Test Keep' };
            const options = handler.getOptions(site);
            expect(options.length).toBe(1);
            expect(options[0].id).toBe('attack');
            expect(options[0].label).toBe('Angreifen (Erobern)');
        });

        it('should return recruit option for conquered keep', () => {
            const site = { conquered: true, getName: () => 'Test Keep' };
            const options = handler.getOptions(site);
            // Now includes recruit + artifact reward
            expect(options.length).toBe(2);
            const recruit = options.find(o => o.id === 'recruit');
            expect(recruit).toBeDefined();
            expect(recruit.id).toBe('recruit');
            expect(recruit.label).toBe('Einheiten rekrutieren');

            const artifact = options.find(o => o.id === 'artifact');
            expect(artifact).toBeDefined();
            expect(artifact.id).toBe('artifact');
            expect(artifact.label).toBe('Artefakt suchen');
        });

        it('should attack site and start combat', () => {
            const site = { getName: () => 'Test Keep' };
            game.combatOrchestrator.initiateCombat = vi.fn();
            const result = handler.attackSite(site);
            expect(result.success).toBe(true);
            expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalled();
        });
    });

    describe('MageTowerHandler', () => {
        let handler;

        beforeEach(() => {
            handler = new MageTowerHandler(game);
        });

        it('should return attack option for unconquered tower', () => {
            const site = { conquered: false, getName: () => 'Mage Tower' };
            const options = handler.getOptions(site);
            expect(options.length).toBeGreaterThanOrEqual(1);
        });

        it('should return attack option with correct properties', () => {
            const site = { conquered: false, getName: () => 'Mage Tower' };
            const options = handler.getOptions(site);
            const attack = options.find(o => o.id === 'attack');
            expect(attack).toBeDefined();
            expect(attack.label).toBe('Magierturm angreifen (Erobern)');
            expect(attack.enabled).toBe(true);
            expect(typeof attack.action).toBe('function');
        });

        it('should return spells option when conquered', () => {
            const site = { conquered: true, getName: () => 'Mage Tower' };
            const options = handler.getOptions(site);
            const spells = options.find(o => o.id === 'spells');
            expect(spells).toBeDefined();
            expect(spells.label).toBe('Zauber lernen (7 Einfluss + Mana)');
            expect(spells.subItems).toBeDefined();
            expect(spells.subItems.length).toBeGreaterThan(0);
        });

        it('should have spell subItems with correct structure', () => {
            const site = { conquered: true, getName: () => 'Mage Tower' };
            const options = handler.getOptions(site);
            const spells = options.find(o => o.id === 'spells');
            const firstSpell = spells.subItems[0];
            expect(firstSpell.id).toMatch(/^spell_/);
            expect(firstSpell.label).toBeDefined();
            expect(firstSpell.type).toBe('card');
            expect(firstSpell.data).toBeDefined();
            expect(firstSpell.cost).toBe(7);
            expect(typeof firstSpell.action).toBe('function');
        });

        it('should attack for unconquered tower', () => {
            const site = { conquered: false, getName: () => 'Mage Tower' };
            game.combatOrchestrator.initiateCombat = vi.fn();
            game.addLog = vi.fn();
            const result = handler.attackSite(site);
            expect(result.success).toBe(true);
            expect(game.addLog).toHaveBeenCalled();
            expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalled();
            const enemy = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
            expect(enemy.name).toBe('Wächter des Turms');
            expect(enemy.armor).toBe(5);
            expect(enemy.attack).toBe(5);
            expect(enemy.fortified).toBe(true);
            expect(enemy.attackType).toBe('fire');
        });

        it('should allow executing attack action from options', () => {
            const site = { conquered: false, getName: () => 'Mage Tower' };
            const options = handler.getOptions(site);
            const attack = options.find(o => o.id === 'attack');
            game.combatOrchestrator.initiateCombat = vi.fn();
            game.addLog = vi.fn();
            const result = attack.action();
            expect(result.success).toBe(true);
            expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalled();
        });
    });

    describe('MineHandler', () => {
        let handler;

        beforeEach(() => {
            handler = new MineHandler(game);
        });

        it('should return conquer_mine option for unconquered mine', () => {
            const site = { conquered: false, getName: () => 'Mine' };
            const options = handler.getOptions(site);
            expect(options.length).toBe(1);
            expect(options[0].id).toBe('conquer_mine');
        });

        it('should attack and clear mine', () => {
            const site = { getName: () => 'Mine' };
            game.combatOrchestrator.initiateCombat = vi.fn();
            const result = handler.attackMine();
            expect(result.success).toBe(true);
        });
    });

    describe('SpawningGroundsHandler', () => {
        let handler;

        beforeEach(() => {
            handler = new SpawningGroundsHandler(game);
        });

        it('should return attack_spawning option for unconquered spawn', () => {
            const site = { conquered: false, getName: () => 'Spawning Grounds' };
            const options = handler.getOptions(site);
            expect(options.length).toBe(1);
            expect(options[0].id).toBe('attack_spawning');
        });

        it('should attack spawning grounds', () => {
            const site = { getName: () => 'Spawning Grounds', clear: vi.fn() };
            game.combatOrchestrator.initiateCombat = vi.fn();
            const result = handler.attackSpawningGrounds();
            expect(result.success).toBe(true);
        });
    });

    describe('ExplorationHandler', () => {
        let handler;

        beforeEach(() => {
            handler = new ExplorationHandler(game);
        });

        it('should return explore option for dungeon', () => {
            const site = { conquered: false, getName: () => 'Dungeon', type: 'dungeon' };
            const options = handler.getOptions(site);
            expect(options.length).toBeGreaterThan(0);
            const explore = options.find(o => o.id === 'explore_dungeon');
            expect(explore).toBeDefined();
        });

        it('should explore dungeon and start combat', () => {
            const site = { getName: () => 'Dungeon', type: 'dungeon' };
            game.addLog = vi.fn();
            game.combatOrchestrator.initiateCombat = vi.fn();
            const result = handler.exploreDungeon();
            expect(result.success).toBe(true);
            expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalled();
        });
    });

    describe('LabyrinthHandler', () => {
        let handler;

        beforeEach(() => {
            handler = new LabyrinthHandler(game);
        });

        it('should return options for labyrinth', () => {
            const site = { conquered: false, getName: () => 'Labyrinth' };
            const options = handler.getOptions(site);
            expect(options.length).toBeGreaterThan(0);
        });

        it('should return explore option for unconquered labyrinth', () => {
            const site = { conquered: false, getName: () => 'Labyrinth' };
            const options = handler.getOptions(site);
            expect(options.length).toBe(1);
            expect(options[0].id).toBe('explore_labyrinth');
            expect(options[0].label).toBe('Labyrinth betreten (Mehrere Kämpfe)');
            expect(options[0].enabled).toBe(true);
        });

        it('should return disabled option for conquered labyrinth', () => {
            const site = { conquered: true, getName: () => 'Labyrinth' };
            const options = handler.getOptions(site);
            expect(options.length).toBe(1);
            expect(options[0].id).toBe('cleared');
            expect(options[0].label).toBe('Labyrinth bereits durchquert');
            expect(options[0].enabled).toBe(false);
        });

        it('should explore labyrinth and start combat with mage theme enemy', () => {
            game.addLog = vi.fn();
            game.combatOrchestrator.initiateCombat = vi.fn();
            
            // Mock Math.random to return specific enemy types
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.6); // > 0.5 = mage
            
            const result = handler.exploreLabyrinth();
            
            expect(result.success).toBe(true);
            expect(result.message).toBe('Labyrinth betreten!');
            expect(game.addLog).toHaveBeenCalled();
            expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalled();
            
            const enemies = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
            expect(enemies.length).toBe(2);
            expect(enemies[0].type).toBe('mage'); // or 'golem' depending on random
            expect(enemies[1].type).toMatch(/draconum|orc_khan/);
            
            randomSpy.mockRestore();
        });

        it('should explore labyrinth and start combat with golem theme enemy', () => {
            game.addLog = vi.fn();
            game.combatOrchestrator.initiateCombat = vi.fn();
            
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4); // < 0.5 = golem
            
            const result = handler.exploreLabyrinth();
            
            expect(result.success).toBe(true);
            expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalled();
            
            const enemies = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
            expect(enemies[0].type).toBe('golem');
            
            randomSpy.mockRestore();
        });
    });

    describe('CityHandler', () => {
        let handler;

        beforeEach(() => {
            handler = new CityHandler(game);
        });

        it('should return options for city', () => {
            const site = { getName: () => 'City' };
            const options = handler.getOptions(site);
            expect(options.length).toBeGreaterThan(0);
        });

        it('should have heal and recruit_elite options', () => {
            const site = { getName: () => 'City' };
            const options = handler.getOptions(site);
            const heal = options.find(o => o.id === 'heal');
            const recruit = options.find(o => o.id === 'recruit_elite');
            expect(heal).toBeDefined();
            expect(recruit).toBeDefined();
        });
    });

    describe('VillageHandler', () => {
        let handler;

        beforeEach(() => {
            handler = new VillageHandler(game);
        });

        it('should return options for village', () => {
            const site = { conquered: false, getName: () => 'Village' };
            const options = handler.getOptions(site);
            expect(options.length).toBeGreaterThan(0);
        });

        it('should return heal option with correct properties', () => {
            const site = { conquered: false, getName: () => 'Village' };
            const options = handler.getOptions(site);
            const heal = options.find(o => o.id === 'heal');
            expect(heal).toBeDefined();
            expect(heal.id).toBe('heal');
            expect(heal.label).toBe('Heilen (3 Einfluss / Wunde)');
            expect(typeof heal.action).toBe('function');
        });

        it('should enable heal when hero has wounds', () => {
            const site = { conquered: false, getName: () => 'Village' };
            game.hero.wounds = [{ id: 'w1' }];
            const options = handler.getOptions(site);
            const heal = options.find(o => o.id === 'heal');
            expect(heal.enabled).toBe(true);
        });

        it('should disable heal when hero has no wounds', () => {
            const site = { conquered: false, getName: () => 'Village' };
            game.hero.wounds = [];
            const options = handler.getOptions(site);
            const heal = options.find(o => o.id === 'heal');
            expect(heal.enabled).toBe(false);
        });

        it('should return recruit option with subItems', () => {
            const site = { conquered: false, getName: () => 'Village' };
            const options = handler.getOptions(site);
            const recruit = options.find(o => o.id === 'recruit');
            expect(recruit).toBeDefined();
            expect(recruit.id).toBe('recruit');
            expect(recruit.label).toBe('Einheiten rekrutieren');
            expect(recruit.subItems).toBeDefined();
            expect(Array.isArray(recruit.subItems)).toBe(true);
            expect(recruit.subItems.length).toBeGreaterThan(0);
        });

        it('should have recruit subItems with correct structure', () => {
            const site = { conquered: false, getName: () => 'Village' };
            const options = handler.getOptions(site);
            const recruit = options.find(o => o.id === 'recruit');
            const firstUnit = recruit.subItems[0];
            expect(firstUnit.id).toMatch(/^recruit_/);
            expect(firstUnit.label).toBeDefined();
            expect(firstUnit.type).toBe('unit');
            expect(firstUnit.data).toBeDefined();
            expect(firstUnit.cost).toBeDefined();
            expect(typeof firstUnit.action).toBe('function');
        });

        it('should allow executing heal action', () => {
            const site = { conquered: false, getName: () => 'Village' };
            const options = handler.getOptions(site);
            const heal = options.find(o => o.id === 'heal');
            game.hero.wounds = [{ id: 'w1' }];
            game.hero.influencePoints = 10;
            game.hero.healWound = vi.fn().mockReturnValue(true);
            const result = heal.action();
            expect(result.success).toBe(true);
            expect(game.hero.healWound).toHaveBeenCalledWith(false);
        });

        it('should allow executing recruit action for first unit', () => {
            const site = { conquered: false, getName: () => 'Village' };
            const options = handler.getOptions(site);
            const recruit = options.find(o => o.id === 'recruit');
            const firstUnit = recruit.subItems[0];
            game.hero.influencePoints = 10;
            game.hero.addUnit = vi.fn().mockReturnValue(true);
            const result = firstUnit.action();
            expect(result.success).toBe(true);
            expect(game.hero.addUnit).toHaveBeenCalled();
        });
    });

    describe('MonasteryHandler', () => {
        let handler;

        beforeEach(() => {
            handler = new MonasteryHandler(game);
        });

        it('should return options for monastery', () => {
            const site = { conquered: false, getName: () => 'Monastery' };
            const options = handler.getOptions(site);
            expect(options.length).toBeGreaterThan(0);
        });

        it('should return heal option with correct properties', () => {
            const site = { conquered: false, getName: () => 'Monastery' };
            const options = handler.getOptions(site);
            const heal = options.find(o => o.id === 'heal');
            expect(heal).toBeDefined();
            expect(heal.id).toBe('heal');
            expect(heal.label).toBe('Heilen (2 Einfluss / Wunde)');
            expect(typeof heal.action).toBe('function');
        });

        it('should enable heal when hero has wounds', () => {
            const site = { conquered: false, getName: () => 'Monastery' };
            game.hero.wounds = [{ id: 'w1' }];
            const options = handler.getOptions(site);
            const heal = options.find(o => o.id === 'heal');
            expect(heal.enabled).toBe(true);
        });

        it('should disable heal when hero has no wounds', () => {
            const site = { conquered: false, getName: () => 'Monastery' };
            game.hero.wounds = [];
            const options = handler.getOptions(site);
            const heal = options.find(o => o.id === 'heal');
            expect(heal.enabled).toBe(false);
        });

        it('should return train option with subItems', () => {
            const site = { conquered: false, getName: () => 'Monastery' };
            const options = handler.getOptions(site);
            const train = options.find(o => o.id === 'train');
            expect(train).toBeDefined();
            expect(train.id).toBe('train');
            expect(train.label).toBe('Training (Karten kaufen)');
            expect(train.subItems).toBeDefined();
            expect(Array.isArray(train.subItems)).toBe(true);
            expect(train.subItems.length).toBeGreaterThan(0);
        });

        it('should have train subItems with correct structure', () => {
            const site = { conquered: false, getName: () => 'Monastery' };
            const options = handler.getOptions(site);
            const train = options.find(o => o.id === 'train');
            const firstCard = train.subItems[0];
            expect(firstCard.id).toMatch(/^train_/);
            expect(firstCard.label).toBeDefined();
            expect(firstCard.type).toBe('card');
            expect(firstCard.data).toBeDefined();
            expect(firstCard.cost).toBe(6);
            expect(typeof firstCard.action).toBe('function');
        });

        it('should allow executing heal action', () => {
            const site = { conquered: false, getName: () => 'Monastery' };
            const options = handler.getOptions(site);
            const heal = options.find(o => o.id === 'heal');
            game.hero.wounds = [{ id: 'w1' }];
            game.hero.influencePoints = 10;
            game.hero.healWound = vi.fn().mockReturnValue(true);
            const result = heal.action();
            expect(result.success).toBe(true);
            expect(game.hero.healWound).toHaveBeenCalledWith(false);
        });

        it('should allow executing train action for first card', () => {
            const site = { conquered: false, getName: () => 'Monastery' };
            const options = handler.getOptions(site);
            const train = options.find(o => o.id === 'train');
            const firstCard = train.subItems[0];
            game.hero.influencePoints = 10;
            // buyCard checks mana inventory - mock it
            game.hero.getManaInventory = vi.fn().mockReturnValue(['red']);
            game.hero.removeMana = vi.fn();
            game.hero.discard = [];
            game.hero.discard.push = vi.fn();
            const result = firstCard.action();
            expect(result.success).toBe(true);
            expect(game.hero.discard.push).toHaveBeenCalled();
        });
    });

    describe('BaseSiteHandler shared methods', () => {
        let handler;

        beforeEach(() => {
            handler = new KeepHandler(game);
        });

        it('should heal wound when enough influence', () => {
            game.hero.influencePoints = 5;
            game.hero.wounds = [{ id: 'w1' }];
            game.hero.healWound = vi.fn().mockReturnValue(true);
            const result = handler.healWounds(3);
            expect(result.success).toBe(true);
            expect(game.hero.influencePoints).toBe(2);
            expect(game.hero.healWound).toHaveBeenCalledWith(false);
        });

        it('should fail heal when not enough influence', () => {
            game.hero.influencePoints = 2;
            const result = handler.healWounds(3);
            expect(result.success).toBe(false);
        });

        it('should recruit unit when enough influence', () => {
            game.hero.influencePoints = 10;
            const unitInfo = { cost: 5, type: 'peasant', create: () => ({ type: 'peasant', name: 'Peasant', id: 'test', armor: 1, attack: 1, element: 'physical' }) };
            game.hero.addUnit = vi.fn().mockReturnValue(true);
            const result = handler.recruitUnit(unitInfo);
            expect(result.success).toBe(true);
            expect(game.hero.influencePoints).toBe(5);
        });

        it('should fail recruit when not enough influence', () => {
            game.hero.influencePoints = 3;
            const unitInfo = { cost: 5 };
            const result = handler.recruitUnit(unitInfo);
            expect(result.success).toBe(false);
        });
    });
});