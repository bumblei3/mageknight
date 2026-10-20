import { describe, it, expect, vi } from 'vitest';
import { MagicGladeHandler } from '../../js/sites/MagicGladeHandler.js';
import { DenHandler } from '../../js/sites/DenHandler.js';

function makeHero(overrides = {}) {
    const base = {
        influencePoints: 5,
        wounds: [{ id: 'w1' }],
        healingPoints: 1,
        getReputationModifier: () => 0,
        gainFame: vi.fn(() => ({ leveledUp: false })),
        addMana: vi.fn(),
        takeManaFromSource: vi.fn(),
        getManaInventory: vi.fn(() => []),
        spendMana: vi.fn(() => true),
        addUnit: vi.fn(() => true),
        healWound: vi.fn(() => true),
    };
    return { ...base, movementPoints: 2, ...overrides };
}

function makeGame(heroOverrides = {}) {
    return {
        hero: makeHero(heroOverrides),
        addLog: vi.fn(),
        combatOrchestrator: { initiateCombat: vi.fn() },
        particleSystem: { buffEffect: vi.fn() },
        hexGrid: { axialToPixel: vi.fn(() => ({ x: 0, y: 0 })) },
        render: vi.fn(),
        updateStats: vi.fn(),
    };
}

describe('MagicGladeHandler', () => {
    it('attackGlade initiates combat with Hain-Wächter', () => {
        const game = makeGame();
        const handler = new MagicGladeHandler(game);
        const result = handler.attackGlade();

        expect(result.success).toBe(true);
        expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalledTimes(1);
        const enemy = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemy.name).toBe('Hain-Wächter');
    });

    it('channelMana adds a random color mana and spends 1 movement', () => {
        const game = makeGame({ hero: makeHero({ movementPoints: 2 }) });
        const handler = new MagicGladeHandler(game);
        const result = handler.channelMana({ q: 0, r: 0 });

        expect(result.success).toBe(true);
        expect(game.hero.addMana).toHaveBeenCalledTimes(1);
        expect(game.hero.movementPoints).toBe(1);
    });

    it('channelMana rejects when movement < 1', () => {
        const game = makeGame({ movementPoints: 0 });
        const handler = new MagicGladeHandler(game);
        const result = handler.channelMana({ q: 0, r: 0 });

        expect(result.success).toBe(false);
        expect(game.hero.addMana).not.toHaveBeenCalled();
    });

    it('getOptions returns conquer_glade when not conquered', () => {
        const game = makeGame();
        const handler = new MagicGladeHandler(game);
        const options = handler.getOptions({ conquered: false });

        expect(options.some((o) => o.id === 'conquer_glade')).toBe(true);
    });

    it('getOptions returns channel_mana when conquered', () => {
        const game = makeGame();
        const handler = new MagicGladeHandler(game);
        const options = handler.getOptions({ conquered: true });

        expect(options.some((o) => o.id === 'channel_mana')).toBe(true);
    });
});

describe('DenHandler', () => {
    it('attackDen initiates combat with Hort-Wächter', () => {
        const game = makeGame();
        const handler = new DenHandler(game);
        const result = handler.attackDen();

        expect(result.success).toBe(true);
        expect(game.combatOrchestrator.initiateCombat).toHaveBeenCalledTimes(1);
        const enemy = game.combatOrchestrator.initiateCombat.mock.calls[0][0];
        expect(enemy.name).toBe('Hort-Wächter');
    });

    it('claimSpoils gains fame/influence and spends 1 movement', () => {
        const game = makeGame({ hero: makeHero({ movementPoints: 2 }) });
        const handler = new DenHandler(game);
        const result = handler.claimSpoils();

        expect(result.success).toBe(true);
        expect(game.hero.gainFame).toHaveBeenCalledWith(2);
        expect(game.hero.movementPoints).toBe(1);
    });

    it('claimSpoils rejects when movement < 1', () => {
        const game = makeGame({ movementPoints: 0 });
        const handler = new DenHandler(game);
        const result = handler.claimSpoils();

        expect(result.success).toBe(false);
        expect(game.hero.gainFame).not.toHaveBeenCalled();
    });

    it('getOptions returns conquer_den when not conquered', () => {
        const game = makeGame();
        const handler = new DenHandler(game);
        const options = handler.getOptions({ conquered: false });

        expect(options.some((o) => o.id === 'conquer_den')).toBe(true);
    });

    it('getOptions returns claim_spoils when conquered', () => {
        const game = makeGame();
        const handler = new DenHandler(game);
        const options = handler.getOptions({ conquered: true });

        expect(options.some((o) => o.id === 'claim_spoils')).toBe(true);
    });
});
