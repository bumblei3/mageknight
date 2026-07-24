import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MageKnightGame } from '../../js/game.js';
import { COMBAT_PHASE } from '../../js/combat.js';
import { createSpy } from '../test-mocks.js';
import { store } from '../../js/store.js';
import { setLanguage } from '../../js/i18n/index.js';

describe('Combat Ranged Phase Integration', () => {
    let game;
    let enemy;

    function makeEnemy(overrides = {}) {
        return {
            id: 'e1',
            name: 'Orc',
            armor: 4,
            attack: 3,
            fame: 2,
            getResistanceMultiplier: () => 1,
            getEffectiveAttack: () => 3,
            getBlockRequirement: () => 3,
            currentHealth: 1,
            maxHealth: 1,
            position: { q: 1, r: 1 },
            ...overrides
        };
    }

    function setupUiMocks() {
        game.ui = {
            addLog: createSpy(),
            showCombatPanel: createSpy(),
            hideCombatPanel: createSpy(),
            hidePlayArea: createSpy(),
            updateCombatInfo: createSpy(),
            updateCombatTotals: createSpy(),
            renderUnitsInCombat: createSpy(),
            updatePhaseIndicator: createSpy(),
            updateStats: createSpy(),
            renderHand: createSpy(),
            renderHandCards: createSpy(),
            updateHeroStats: createSpy(),
            updateMovementPoints: createSpy(),
            renderUnits: createSpy(),
            setButtonEnabled: createSpy(),
            showScenarioSelection: createSpy(() => Promise.resolve()),
            showHeroSelection: createSpy(() => Promise.resolve()),
            showSaveLoad: createSpy(() => Promise.resolve(null)),
            showSettings: createSpy(() => Promise.resolve()),
            showShortcuts: createSpy(() => Promise.resolve()),
            elements: {
                playedCards: { getBoundingClientRect: () => ({ top: 0, right: 0 }) },
                exploreBtn: { style: {} },
                visitBtn: { style: {} }
            }
        };
        game.addLog = createSpy();
        game.particleSystem = {
            impactEffect: createSpy(),
            createDamageNumber: createSpy(),
            triggerShake: createSpy()
        };
    }

    /** Put a ranged card in hand so auto-skip does not leave RANGED */
    function giveRangedCard() {
        if (!game.hero) return;
        game.hero.hand = [
            {
                id: 'ranged_test',
                name: 'Bow',
                basicEffect: { ranged: 2 },
                strongEffect: { ranged: 4 },
                isWound: () => false
            }
        ];
    }

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = `
            <canvas id="game-board"></canvas>
            <div id="game-log"></div>
            <div id="hand-cards"></div>
            <div id="mana-source"></div>
            <div id="fame-value">0</div>
            <div id="reputation-value">0</div>
            <div id="hero-armor">0</div>
            <div id="hero-handlimit">0</div>
            <div id="hero-wounds">0</div>
            <div id="hero-name">Hero</div>
            <div id="movement-points">0</div>
            <div id="skill-list"></div>
            <div id="healing-points">0</div>
            <div id="mana-bank"></div>
            <div id="particle-layer" class="canvas-layer"></div>
        `;
        game = new MageKnightGame();
        enemy = makeEnemy();
        setupUiMocks();
        giveRangedCard();
        game.combatOrchestrator.initiateCombat(enemy);
    });

    afterEach(() => {
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('should start in RANGED phase when player has ranged cards', () => {
        expect(game.combat.phase).toBe(COMBAT_PHASE.RANGED);
        expect(game.ui.showCombatPanel.callCount).toBe(1);
    });

    it('should auto-skip to BLOCK when no ranged options', () => {
        // New combat without ranged hand
        game.combat = null;
        game.gameState = 'playing';
        if (game.hero) game.hero.hand = [{ basicEffect: { attack: 2 }, isWound: () => false }];
        game.addLog = createSpy();
        game.combatOrchestrator.initiateCombat(makeEnemy({ id: 'e2' }));

        expect(game.combat.phase).toBe(COMBAT_PHASE.BLOCK);
        expect(game.addLog.calls.some((c) => String(c[0]).includes('übersprungen') || String(c[0]).includes('skipped'))).toBe(
            true
        );
    });

    it('should transition to BLOCK phase when executeAttackAction (End Phase) is called', () => {
        expect(game.combat.phase).toBe(COMBAT_PHASE.RANGED);
        game.combatOrchestrator.executeAttackAction(); // In Ranged phase, this is "End Phase"

        expect(game.combat.phase).toBe(COMBAT_PHASE.BLOCK);
        expect(game.addLog.calls.some((c) => String(c[0]).includes('Block'))).toBe(true);
    });

    it('should handle Ranged Attack properly', () => {
        // Orchestrator owns ranged totals (not game.*)
        game.combatOrchestrator.combatRangedTotal = 5; // Enough for Armor 4

        game.handleEnemyClick(game.combat.enemies[0]);

        // Since it was the only enemy, combat should end
        expect(game.combat).toBeNull();
        expect(game.addLog.calls.some((c) => String(c[0]).includes('besiegt'))).toBe(true);
        expect(game.combatOrchestrator.combatRangedTotal).toBe(0);
    });

    it('should FAIL Ranged Attack if insufficient damage', () => {
        game.combatOrchestrator.combatRangedTotal = 2; // Not enough for Armor 4

        game.handleEnemyClick(game.combat.enemies[0]);

        expect(game.combat).toBeTruthy();
        expect(game.combat.enemies.length).toBe(1);
        expect(game.addLog.calls.some((c) => String(c[0]).includes('zu schwach'))).toBe(true);
    });
});
