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
            expect(options.length).toBe(1);
            expect(options[0].id).toBe('recruit');
            expect(options[0].label).toBe('Einheiten rekrutieren');
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

        it('should attack for unconquered tower', () => {
            const site = { conquered: false, getName: () => 'Mage Tower' };
            game.combatOrchestrator.initiateCombat = vi.fn();
            const result = handler.attackSite(site);
            expect(result.success).toBe(true);
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