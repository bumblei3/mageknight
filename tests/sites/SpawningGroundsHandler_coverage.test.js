import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpawningGroundsHandler } from '../../js/sites/SpawningGroundsHandler.js';

describe('SpawningGroundsHandler - Coverage Boost', () => {
    let handler;
    let mockGame;

    beforeEach(() => {
        mockGame = {
            addLog: vi.fn(),
            combatOrchestrator: {
                initiateCombat: vi.fn()
            },
            hero: {
                influencePoints: 10,
                addUnit: vi.fn()
            }
        };
        handler = new SpawningGroundsHandler(mockGame);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return cleared option for conquered spawning grounds', () => {
        const site = { conquered: true, getName: () => 'Spawning Grounds' };
        const options = handler.getOptions(site);
        
        expect(options.length).toBe(1);
        expect(options[0].id).toBe('cleared');
        expect(options[0].label).toBe('Brutstätte bereits gesäubert');
        expect(options[0].enabled).toBe(false);
    });

    it('should return attack_spawning option for unconquered spawning grounds', () => {
        const site = { conquered: false, getName: () => 'Spawning Grounds' };
        const options = handler.getOptions(site);
        
        expect(options.length).toBe(1);
        expect(options[0].id).toBe('attack_spawning');
        expect(options[0].label).toBe('Brutstätte angreifen (Monsterwellen)');
        expect(options[0].enabled).toBe(true);
        expect(typeof options[0].action).toBe('function');
    });

    it('should attack spawning grounds with queen and minion', () => {
        const site = { getName: () => 'Spawning Grounds', clear: vi.fn() };
        
        // Mock Math.random for deterministic enemy selection
        const spy = vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.6) // isQueen = true (0.6 > 0.5)
            .mockReturnValueOnce(0.3); // not used in this version
        
        const result = handler.attackSpawningGrounds();
        
        expect(result.success).toBe(true);
        expect(result.message).toBe('Brutstätte betreten!');
        expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('Brutstätte'), 'warning');
        expect(mockGame.combatOrchestrator.initiateCombat).toHaveBeenCalled();
        
        const enemies = mockGame.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemies.length).toBe(2);
        expect(enemies[0].name).toBe('Spinnen-Königin');
        expect(enemies[0].poison).toBe(true);
        expect(enemies[0].summoner).toBe(true);
        expect(enemies[1].name).toBe('Sumpf-Ratte');
        expect(enemies[1].swift).toBe(true);
        
        spy.mockRestore();
    });

    it('should attack spawning grounds with horde and minion', () => {
        const site = { getName: () => 'Spawning Grounds', clear: vi.fn() };
        
        const spy = vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.3); // isQueen = false (0.3 <= 0.5)
        
        const result = handler.attackSpawningGrounds();
        
        expect(result.success).toBe(true);
        
        const enemies = mockGame.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemies.length).toBe(2);
        expect(enemies[0].name).toBe('Ork-Horde');
        expect(enemies[0].brutal).toBe(true);
        expect(enemies[1].name).toBe('Sumpf-Ratte');
        expect(enemies[1].swift).toBe(true);
        
        spy.mockRestore();
    });

    it('should allow executing attack action from options', () => {
        const site = { conquered: false, getName: () => 'Spawning Grounds', clear: vi.fn() };
        const options = handler.getOptions(site);
        const attack = options.find(o => o.id === 'attack_spawning');
        
        mockGame.combatOrchestrator.initiateCombat = vi.fn();
        
        const result = attack.action();
        
        expect(result.success).toBe(true);
        expect(mockGame.combatOrchestrator.initiateCombat).toHaveBeenCalled();
    });
});