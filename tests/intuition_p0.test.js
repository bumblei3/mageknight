/**
 * Intuition P0: movement costs, combat-danger hexes, auto-skip empty ranged.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HexGridLogic } from '../js/hexgrid/HexGridLogic.js';
import { CombatOrchestrator } from '../js/game/CombatOrchestrator.js';
import { COMBAT_PHASES } from '../js/constants.js';

describe('Intuition P0 — reachable hex costs', () => {
    it('includes path cost on each reachable hex', () => {
        const grid = new HexGridLogic(40);
        for (let q = -2; q <= 2; q++) {
            for (let r = -2; r <= 2; r++) {
                grid.setHex(q, r, { terrain: 'plains' });
            }
        }
        const reachable = grid.getReachableHexes({ q: 0, r: 0 }, 4, true);
        expect(reachable.length).toBeGreaterThan(0);
        for (const h of reachable) {
            expect(typeof h.cost).toBe('number');
            expect(h.cost).toBeGreaterThan(0);
            expect(h.cost).toBeLessThanOrEqual(4);
        }
        // Adjacent plains cost 2
        const adj = reachable.find((h) => h.q === 1 && h.r === 0);
        expect(adj).toBeTruthy();
        expect(adj.cost).toBe(2);
    });
});

describe('Intuition P0 — auto-skip empty ranged phase', () => {
    function makeGame(handCards = []) {
        const hand = handCards.map((effects) => ({
            isWound: () => false,
            basicEffect: effects.basic || {},
            strongEffect: effects.strong || {}
        }));
        const enemies = [
            {
                id: 'e1',
                name: 'Orc',
                armor: 3,
                attack: 2,
                position: { q: 1, r: 0 },
                isDefeated: () => false,
                getEffectiveAttack: () => 2,
                getBlockRequirement: () => 2
            }
        ];
        const game = {
            combat: null,
            gameState: 'playing',
            isTestEnvironment: true,
            hero: { hand, units: [], armor: 2, name: 'Hero' },
            enemies,
            hexGrid: null,
            ui: {
                showCombatPanel: vi.fn(),
                updateCombatTotals: vi.fn(),
                updateCombatInfo: vi.fn()
            },
            addLog: vi.fn(),
            showToast: vi.fn(),
            updatePhaseIndicator: vi.fn(),
            updateStats: vi.fn()
        };
        return game;
    }

    it('shouldAutoSkipRangedPhase is true without ranged cards', () => {
        const game = makeGame([{ basic: { attack: 2 } }, { basic: { block: 2 } }]);
        const orch = new CombatOrchestrator(game);
        expect(orch.shouldAutoSkipRangedPhase()).toBe(true);
    });

    it('shouldAutoSkipRangedPhase is false with ranged card', () => {
        const game = makeGame([{ basic: { ranged: 2 } }]);
        const orch = new CombatOrchestrator(game);
        expect(orch.shouldAutoSkipRangedPhase()).toBe(false);
    });

    it('shouldAutoSkipRangedPhase is false with siege card', () => {
        const game = makeGame([{ strong: { siege: 3 } }]);
        const orch = new CombatOrchestrator(game);
        expect(orch.shouldAutoSkipRangedPhase()).toBe(false);
    });

    it('initiateCombat skips to BLOCK when no ranged options', () => {
        const game = makeGame([{ basic: { block: 3 } }]);
        const orch = new CombatOrchestrator(game);
        orch.initiateCombat(game.enemies[0]);
        expect(game.combat).toBeTruthy();
        expect(game.combat.phase).toBe(COMBAT_PHASES.BLOCK);
        expect(game.showToast).toHaveBeenCalled();
        expect(game.addLog).toHaveBeenCalled();
    });

    it('initiateCombat stays in RANGED when ranged card present', () => {
        const game = makeGame([{ basic: { ranged: 2 } }]);
        const orch = new CombatOrchestrator(game);
        orch.initiateCombat(game.enemies[0]);
        expect(game.combat.phase).toBe(COMBAT_PHASES.RANGED);
    });
});

describe('Intuition P0 — trait phase relevance', () => {
    it('swift is relevant in block phase (via CombatUIManager helper)', async () => {
        // Lightweight check: trait chip helper lives on the class prototype
        const { CombatUIManager } = await import('../js/ui/CombatUIManager.js');
        const mgr = new CombatUIManager({}, {});
        // private method accessed for unit test
        expect(mgr['isTraitRelevantInPhase']('swift', 'block')).toBe(true);
        expect(mgr['isTraitRelevantInPhase']('swift', 'ranged')).toBe(false);
        expect(mgr['isTraitRelevantInPhase']('fortified', 'ranged')).toBe(true);
        expect(mgr['isTraitRelevantInPhase']('fortified', 'attack')).toBe(false);
    });
});
